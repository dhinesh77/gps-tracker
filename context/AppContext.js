import React, { createContext, useState, useEffect, useRef, useContext } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showFloatingWindow, hideFloatingWindow } from '../modules/expo-floating-window';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';
const SETTINGS_KEY = '@floating_card_settings';
const TIME_FORMAT_KEY = '@time_format';
const VOICE_ALERT_KEY = '@voice_alert_freq';
const CUSTOM_VOICE_ALERT_KEY = '@custom_voice_alert_freq';
const HISTORY_KEY = '@navigation_history';

let globalCurrentLocation = null;

// Define background task only once
if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask(BACKGROUND_LOCATION_TASK, ({ data: { locations }, error }) => {
    if (error) {
      console.error(error);
      return;
    }
    if (locations && locations.length > 0) {
      const location = locations[locations.length - 1];
      globalCurrentLocation = location;
    }
  });
}

const DEFAULT_CARD_SETTINGS = {
  speed: true,
  distance: true,
  requiredSpeed: true,
  timeRemaining: true,
};

const AppContext = createContext(null);

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

export function AppProvider({ children }) {
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [targetDate, setTargetDate] = useState(null);
  const [travelMode, setTravelMode] = useState('driving');
  const [cardSettings, setCardSettings] = useState(DEFAULT_CARD_SETTINGS);
  const [is24Hour, setIs24Hour] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [voiceFreq, setVoiceFreq] = useState('Off');
  const [customVoiceFreq, setCustomVoiceFreq] = useState('5');
  const [lastSpokenTime, setLastSpokenTime] = useState(0);
  const [isMapScrolled, setIsMapScrolled] = useState(false);

  // History
  const [navigationHistory, setNavigationHistory] = useState([]);
  const [currentTripStart, setCurrentTripStart] = useState(null);
  const [currentTripDestName, setCurrentTripDestName] = useState('');

  const mapRef = useRef(null);
  const appState = useRef(AppState.currentState);
  const locationRef = useRef(null);
  const destinationRef = useRef(null);
  const lastRouteFetchTime = useRef(0);

  // Load saved settings
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(SETTINGS_KEY);
        if (saved) setCardSettings(JSON.parse(saved));

        const savedFormat = await AsyncStorage.getItem(TIME_FORMAT_KEY);
        if (savedFormat !== null) setIs24Hour(JSON.parse(savedFormat));

        const savedVoice = await AsyncStorage.getItem(VOICE_ALERT_KEY);
        if (savedVoice !== null) setVoiceFreq(savedVoice);

        const savedCustomVoice = await AsyncStorage.getItem(CUSTOM_VOICE_ALERT_KEY);
        if (savedCustomVoice !== null) setCustomVoiceFreq(savedCustomVoice);

        const savedHistory = await AsyncStorage.getItem(HISTORY_KEY);
        if (savedHistory) setNavigationHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    })();
  }, []);

  // Calculations
  let timeRemainingStr = '--:--';
  let requiredSpeedStr = '--';

  if (speed > 0 && distanceKm > 0) {
    const hours = distanceKm / speed;
    const totalSeconds = Math.round(hours * 3600);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    timeRemainingStr = `${hrs > 0 ? hrs + 'h ' : ''}${mins}m ${secs}s`;
  } else if (distanceKm > 0) {
    timeRemainingStr = 'Stopped';
  }

  if (targetDate && distanceKm > 0) {
    const now = new Date();
    let tDate = new Date(targetDate);
    if (tDate < now) tDate.setDate(tDate.getDate() + 1);

    const diffHours = (tDate - now) / (1000 * 60 * 60);
    if (diffHours > 0) {
      requiredSpeedStr = (distanceKm / diffHours).toFixed(1) + ' km/h';
    }
  }

  const formatTime = (date) => {
    if (!date) return 'Tap to set';
    if (is24Hour) {
      return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } else {
      let hours = date.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${String(date.getMinutes()).padStart(2, '0')} ${ampm}`;
    }
  };

  // Settings update functions
  const updateCardSetting = async (key, value) => {
    const newSettings = { ...cardSettings, [key]: value };
    setCardSettings(newSettings);
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  };

  const updateVoiceFreq = async (val) => {
    setVoiceFreq(val);
    try {
      await AsyncStorage.setItem(VOICE_ALERT_KEY, val);
    } catch (e) {
      console.warn('Failed to save voice setting:', e);
    }
  };

  const saveCustomVoiceFreq = async (val) => {
    setCustomVoiceFreq(val);
    try {
      await AsyncStorage.setItem(CUSTOM_VOICE_ALERT_KEY, val);
    } catch (e) {
      console.warn('Failed to save custom voice freq:', e);
    }
  };

  const updateIs24Hour = async (val) => {
    setIs24Hour(val);
    try {
      await AsyncStorage.setItem(TIME_FORMAT_KEY, JSON.stringify(val));
    } catch (e) {}
  };

  // Voice Alerts
  useEffect(() => {
    if (!isNavigating || voiceFreq === 'Off' || timeRemainingStr === '--:--' || timeRemainingStr === 'Stopped') return;

    const intervalMinutes = parseInt(customVoiceFreq, 10) || 5;
    const intervalSecs = intervalMinutes * 60;
    const nowSecs = Date.now() / 1000;

    if (nowSecs - lastSpokenTime >= intervalSecs) {
      setLastSpokenTime(nowSecs);
      Speech.speak(`Time remaining to destination is ${timeRemainingStr}`);
    }
  }, [timeRemainingStr, isNavigating, voiceFreq, customVoiceFreq, lastSpokenTime]);

  // Floating window in background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.current.match(/active/) && nextAppState === 'background') {
        showFloatingWindow(
          cardSettings.speed ? `${speed.toFixed(1)} km/h` : '',
          cardSettings.distance ? `${distanceKm.toFixed(2)} km` : '',
          cardSettings.requiredSpeed ? requiredSpeedStr : '',
          cardSettings.timeRemaining ? timeRemainingStr : ''
        );
      } else if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        hideFloatingWindow();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, [speed, distanceKm, cardSettings, requiredSpeedStr, timeRemainingStr]);

  // Location watch
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.error('Permission to access location was denied');
        return;
      }

      await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
          setLocation(loc.coords);
          locationRef.current = loc.coords;
          setSpeed(loc.coords.speed ? loc.coords.speed * 3.6 : 0);

          if (mapRef.current && !destinationRef.current && !isMapScrolled) {
            mapRef.current.animateToRegion({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }
        }
      );

      try {
        let { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus === 'granted') {
          await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
            showsBackgroundLocationIndicator: true,
          });
        }
      } catch (e) {
        console.warn('Background location not available:', e);
      }
    })();
  }, [isMapScrolled]);

  // Fetch route when destination or travel mode changes
  useEffect(() => {
    destinationRef.current = destination;
    if (location && destination) {
      fetchRoute();
    }
  }, [destination, travelMode]);

  // Re-fetch route periodically during active navigation (every 15 seconds)
  useEffect(() => {
    if (!isNavigating || !destination) return;

    const interval = setInterval(() => {
      if (locationRef.current && destinationRef.current) {
        fetchRoute();
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isNavigating, destination, travelMode]);

  const fetchRoute = async () => {
    const loc = locationRef.current || location;
    const dest = destinationRef.current || destination;
    if (!loc || !dest) return;

    try {
      const url = `https://router.project-osrm.org/route/v1/${travelMode}/${loc.longitude},${loc.latitude};${dest.longitude},${dest.latitude}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.code === 'Ok' && data.routes.length > 0) {
        const route = data.routes[0];
        setDistanceKm(route.distance / 1000);

        const coords = route.geometry.coordinates.map(c => ({
          latitude: c[1],
          longitude: c[0]
        }));
        setRouteCoords(coords);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Navigation history functions
  const startNavigation = () => {
    setIsNavigating(true);
    setCurrentTripStart(new Date());
    setCurrentTripDestName(searchQuery || 'Map pin');
  };

  const stopNavigation = async () => {
    setIsNavigating(false);

    if (currentTripStart && destination) {
      const trip = {
        id: Date.now().toString(),
        startTime: currentTripStart.toISOString(),
        endTime: new Date().toISOString(),
        destinationName: currentTripDestName,
        destinationCoords: destination,
        startCoords: location ? { latitude: location.latitude, longitude: location.longitude } : null,
        distance: distanceKm,
        travelMode: travelMode,
      };

      const updatedHistory = [trip, ...navigationHistory];
      setNavigationHistory(updatedHistory);

      try {
        await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
      } catch (e) {
        console.warn('Failed to save history:', e);
      }
    }

    setCurrentTripStart(null);
    setCurrentTripDestName('');
  };

  const deleteHistoryItem = async (id) => {
    const updated = navigationHistory.filter(item => item.id !== id);
    setNavigationHistory(updated);
    try {
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save history:', e);
    }
  };

  const clearAllHistory = async () => {
    setNavigationHistory([]);
    try {
      await AsyncStorage.removeItem(HISTORY_KEY);
    } catch (e) {
      console.warn('Failed to clear history:', e);
    }
  };

  const resetAll = () => {
    setDestination(null);
    setRouteCoords([]);
    setDistanceKm(0);
    setSearchQuery('');
    setTargetDate(null);
    setIsNavigating(false);
    setCurrentTripStart(null);
    setCurrentTripDestName('');
  };

  const recenterMap = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setIsMapScrolled(false);
    }
  };

  const value = {
    // Location
    location, setLocation,
    destination, setDestination,
    routeCoords, setRouteCoords,
    distanceKm, setDistanceKm,
    speed, setSpeed,
    targetDate, setTargetDate,
    travelMode, setTravelMode,

    // UI state
    searchQuery, setSearchQuery,
    isNavigating,
    isPanelVisible, setIsPanelVisible,
    isMapScrolled, setIsMapScrolled,

    // Settings
    cardSettings, updateCardSetting,
    is24Hour, updateIs24Hour,
    voiceFreq, updateVoiceFreq,
    customVoiceFreq, saveCustomVoiceFreq,

    // Computed
    timeRemainingStr,
    requiredSpeedStr,
    formatTime,

    // History
    navigationHistory,
    deleteHistoryItem,
    clearAllHistory,

    // Actions
    startNavigation,
    stopNavigation,
    resetAll,
    recenterMap,
    fetchRoute,

    // Refs
    mapRef,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}
