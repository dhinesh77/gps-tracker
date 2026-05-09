import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Dimensions, Platform, AppState, KeyboardAvoidingView, Keyboard, TouchableWithoutFeedback, Modal, Switch, ScrollView, Alert, Animated, Image } from 'react-native';
import { showFloatingWindow, hideFloatingWindow } from './modules/expo-floating-window';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';

const BACKGROUND_LOCATION_TASK = 'BACKGROUND_LOCATION_TASK';
const SETTINGS_KEY = '@floating_card_settings';
const TIME_FORMAT_KEY = '@time_format';
const VOICE_ALERT_KEY = '@voice_alert_freq';
const CUSTOM_VOICE_ALERT_KEY = '@custom_voice_alert_freq';

let globalCurrentLocation = null;

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

const DEFAULT_CARD_SETTINGS = {
  speed: true,
  distance: true,
  requiredSpeed: true,
  timeRemaining: true,
};

export default function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const [location, setLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [distanceKm, setDistanceKm] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [targetDate, setTargetDate] = useState(null);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [travelMode, setTravelMode] = useState('driving');
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [cardSettings, setCardSettings] = useState(DEFAULT_CARD_SETTINGS);
  const [is24Hour, setIs24Hour] = useState(true);

  // Dashboard / Search / Voice / UX States
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const [voiceFreq, setVoiceFreq] = useState('Off');
  const [customVoiceFreq, setCustomVoiceFreq] = useState('5');
  const [lastSpokenTime, setLastSpokenTime] = useState(0);
  const [isMapScrolled, setIsMapScrolled] = useState(false);

  const mapRef = useRef(null);
  const appState = useRef(AppState.currentState);

  // Launch screen animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setIsAppReady(true);
      }, 1500);
    });
  }, []);

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
      } catch (e) {
        console.warn('Failed to load settings:', e);
      }
    })();
  }, []);

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

  const targetTimeDisplay = formatTime(targetDate);

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (event.type === 'set' && selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  // Trigger Voice Alerts
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

  // Sync Floating Window in background
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

  // Initial location watch
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
          setSpeed(loc.coords.speed ? loc.coords.speed * 3.6 : 0);

          if (mapRef.current && !destination && !isMapScrolled) {
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

  useEffect(() => {
    if (location && destination) {
      fetchRoute();
    }
  }, [destination, travelMode]);

  const fetchRoute = async () => {
    try {
      const url = `https://router.project-osrm.org/route/v1/${travelMode}/${location.longitude},${location.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;
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

  const handleMapPress = (e) => {
    setDestination(e.nativeEvent.coordinate);
  };

  const searchDestination = async () => {
    if (!searchQuery.trim()) return;
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results && results.length > 0) {
        const dest = {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
        setDestination(dest);
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: dest.latitude,
            longitude: dest.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
        Keyboard.dismiss();
      } else {
        Alert.alert("Location not found", "We couldn't locate that address. Please try something else.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetAll = () => {
    setDestination(null);
    setRouteCoords([]);
    setDistanceKm(0);
    setSearchQuery('');
    setTargetDate(null);
    setIsNavigating(false);
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

  const CARD_OPTIONS = [
    { key: 'speed', label: 'Current Speed', icon: '⚡' },
    { key: 'distance', label: 'Distance', icon: '📏' },
    { key: 'requiredSpeed', label: 'Required Speed', icon: '🎯' },
    { key: 'timeRemaining', label: 'Time Remaining', icon: '⏱' },
  ];

  if (!isAppReady) {
    return (
      <View style={styles.launchContainer}>
        <Animated.View style={[styles.launchContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
          <Image source={require('./assets/images/react-logo.png')} style={styles.launchIcon} />
          <Text style={styles.launchTitle}>GPS Tracker</Text>
          <Text style={styles.launchSubtitle}>ROAD-AWARE NAVIGATION</Text>
        </Animated.View>
      </View>
    );
  }

  const hasAnyChanges = destination !== null || targetDate !== null || searchQuery.trim() !== '';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{flex: 1}}>
      {location ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onPress={handleMapPress}
          onPanDrag={() => setIsMapScrolled(true)}
          userInterfaceStyle="dark"
        >
          <Marker coordinate={location} title="You" pinColor="cyan" />
          {destination && <Marker coordinate={destination} title="Destination" pinColor="magenta" />}
          {routeCoords.length > 0 && (
            <Polyline coordinates={routeCoords} strokeColor="#d946ef" strokeWidth={4} />
          )}
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={{color: 'white', fontSize: 16}}>Waiting for GPS...</Text>
        </View>
      )}

      {/* Conditional visibility of My Location Button when map is scrolled */}
      {isMapScrolled && (
        <TouchableOpacity onPress={recenterMap} style={styles.myLocationBtn}>
          <Text style={{fontSize: 22}}>🧭</Text>
        </TouchableOpacity>
      )}

      {/* Conditional visibility of Clear All Button */}
      {hasAnyChanges && (
        <TouchableOpacity onPress={resetAll} style={styles.clearBtn}>
          <Text style={{fontSize: 12, color: 'white', fontWeight: 'bold'}}>✖ CLEAR ALL</Text>
        </TouchableOpacity>
      )}

      {/* Floating Dashboard - with collapse toggle to hide to the side */}
      <View style={[styles.dashboard, !isPanelVisible && styles.dashboardCollapsed]}>
        {isPanelVisible ? (
          <>
            {/* Header / Minimize button */}
            <View style={styles.titleRow}>
              <Text style={styles.title}>Travel Tracker</Text>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <TouchableOpacity onPress={() => setSettingsVisible(true)} style={styles.iconBtn}>
                  <Text style={{fontSize: 22}}>⚙️</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setIsPanelVisible(false)} style={styles.iconBtn}>
                  <Text style={{fontSize: 20}}>◀️</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Reliable Search Row */}
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search for destination..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={searchDestination}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={searchDestination}>
                <Text style={{fontSize: 16, color: '#0f172a', fontWeight: 'bold'}}>🔍</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modeContainer}>
              {['driving', 'cycling', 'walking'].map(mode => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.modeBtn, travelMode === mode && styles.modeBtnActive]}
                  onPress={() => setTravelMode(mode)}
                >
                  <Text style={[styles.modeText, travelMode === mode && styles.modeTextActive]}>
                    {mode === 'driving' ? '🚗 Car' : mode === 'cycling' ? '🚲 Bike' : '🚶 Walk'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.label}>Speed</Text>
                <Text style={styles.value}>{speed.toFixed(1)} <Text style={styles.unit}>km/h</Text></Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.label}>Distance</Text>
                <Text style={styles.value}>{distanceKm.toFixed(2)} <Text style={styles.unit}>km</Text></Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.label}>Time Remaining</Text>
                <Text style={styles.valueSmall}>{timeRemainingStr}</Text>
              </View>
              <TouchableOpacity style={styles.metricCardHighlight} onPress={() => setShowTimePicker(true)}>
                <Text style={styles.label}>Target Time</Text>
                <Text style={[styles.valueSmall, !targetDate && {color: '#94a3b8'}]}>{targetTimeDisplay}</Text>
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={targetDate || new Date()}
                  mode="time"
                  is24Hour={is24Hour}
                  display="spinner"
                  onChange={onTimeChange}
                />
              )}
              <View style={styles.metricCardHighlight}>
                <Text style={styles.label}>Required Speed</Text>
                <Text style={styles.valueSmall}>{requiredSpeedStr}</Text>
              </View>
            </View>

            {/* Action Start Button */}
            {destination && (
              <TouchableOpacity
                style={[styles.startNavBtn, isNavigating && styles.stopNavBtn]}
                onPress={() => setIsNavigating(!isNavigating)}
              >
                <Text style={styles.startNavText}>
                  {isNavigating ? '🛑 STOP NAVIGATION' : '🚀 START NAVIGATION'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          /* Small Pull-Tab Toggle to reveal panel back */
          <TouchableOpacity onPress={() => setIsPanelVisible(true)} style={styles.pullTabBtn}>
            <Text style={{fontSize: 22}}>▶️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Settings Modal */}
      <Modal
        visible={settingsVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSettingsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Navigation Settings</Text>
            <Text style={styles.modalSubtitle}>Customize floating dashboard metrics and voice alerts</Text>

            <ScrollView style={styles.settingsList}>
              {CARD_OPTIONS.map(option => (
                <View key={option.key} style={styles.settingRow}>
                  <View style={styles.settingLabelRow}>
                    <Text style={styles.settingIcon}>{option.icon}</Text>
                    <Text style={styles.settingLabel}>{option.label}</Text>
                  </View>
                  <Switch
                    value={cardSettings[option.key]}
                    onValueChange={(val) => updateCardSetting(option.key, val)}
                    trackColor={{ false: '#334155', true: '#06b6d4' }}
                    thumbColor={cardSettings[option.key] ? '#fff' : '#94a3b8'}
                  />
                </View>
              ))}

              <View style={styles.settingDivider} />
              <Text style={styles.settingSectionTitle}>General</Text>

              <View style={styles.settingRow}>
                <View style={styles.settingLabelRow}>
                  <Text style={styles.settingIcon}>🕐</Text>
                  <View>
                    <Text style={styles.settingLabel}>24-Hour Format</Text>
                    <Text style={styles.settingHint}>{is24Hour ? '14:30' : '2:30 PM'}</Text>
                  </View>
                </View>
                <Switch
                  value={is24Hour}
                  onValueChange={async (val) => {
                    setIs24Hour(val);
                    try { await AsyncStorage.setItem(TIME_FORMAT_KEY, JSON.stringify(val)); } catch(e) {}
                  }}
                  trackColor={{ false: '#334155', true: '#06b6d4' }}
                  thumbColor={is24Hour ? '#fff' : '#94a3b8'}
                />
              </View>

              <View style={styles.settingDivider} />
              <Text style={styles.settingSectionTitle}>Voice Alerts</Text>
              
              <View style={styles.voiceFreqContainer}>
                <TouchableOpacity
                  style={[styles.voiceOptionBtn, voiceFreq === 'Off' && styles.voiceOptionBtnActive]}
                  onPress={() => updateVoiceFreq('Off')}
                >
                  <Text style={[styles.voiceOptionText, voiceFreq === 'Off' && styles.voiceOptionTextActive]}>Off</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.voiceOptionBtn, voiceFreq === 'Custom' && styles.voiceOptionBtnActive]}
                  onPress={() => updateVoiceFreq('Custom')}
                >
                  <Text style={[styles.voiceOptionText, voiceFreq === 'Custom' && styles.voiceOptionTextActive]}>Every {customVoiceFreq} min</Text>
                </TouchableOpacity>
              </View>

              {voiceFreq === 'Custom' && (
                <View style={styles.customFreqInputWrapper}>
                  <Text style={styles.customFreqLabel}>Set Custom Frequency (minutes)</Text>
                  <TextInput
                    style={styles.customFreqInput}
                    keyboardType="number-pad"
                    placeholder="e.g., 5"
                    placeholderTextColor="#94a3b8"
                    value={customVoiceFreq}
                    onChangeText={saveCustomVoiceFreq}
                  />
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  launchContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  launchContent: { alignItems: 'center' },
  launchIcon: { width: 120, height: 120, borderRadius: 28, marginBottom: 24, borderWidth: 1, borderColor: '#06b6d4' },
  launchTitle: { fontSize: 32, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  launchSubtitle: { fontSize: 11, color: '#06b6d4', fontWeight: '800', letterSpacing: 3, marginTop: 8 },
  myLocationBtn: {
    position: 'absolute', top: 60, right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 12, borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  clearBtn: {
    position: 'absolute', top: 60, left: 20,
    backgroundColor: 'rgba(225, 29, 72, 0.85)',
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  dashboard: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)', borderRadius: 24, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  dashboardCollapsed: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)', width: 64, height: 64, bottom: 20, left: 'auto', right: 20,
    padding: 0, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#06b6d4', elevation: 10,
  },
  pullTabBtn: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  searchInput: { flex: 1, height: 44, color: '#fff', fontSize: 14, paddingRight: 8 },
  searchBtn: { backgroundColor: '#06b6d4', padding: 10, borderRadius: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#06b6d4' },
  iconBtn: { padding: 4, marginLeft: 12 },
  modeContainer: { flexDirection: 'row', marginBottom: 15, justifyContent: 'space-between' },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  modeBtnActive: { borderColor: '#d946ef', backgroundColor: 'rgba(217, 70, 239, 0.2)' },
  modeText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 12 },
  modeTextActive: { color: '#fff' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  metricCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10, marginBottom: 8 },
  metricCardHighlight: {
    width: '48%', backgroundColor: 'rgba(6, 182, 212, 0.1)', borderRadius: 12, padding: 10, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(6, 182, 212, 0.3)'
  },
  label: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 },
  value: { fontSize: 22, color: '#fff', fontWeight: 'bold' },
  valueSmall: { fontSize: 16, color: '#fff', fontWeight: 'bold' },
  unit: { fontSize: 12, color: '#94a3b8', fontWeight: 'normal' },
  startNavBtn: {
    backgroundColor: '#06b6d4', paddingVertical: 14, borderRadius: 16,
    alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  stopNavBtn: { backgroundColor: '#ef4444' },
  startNavText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14, letterSpacing: 1 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: '#1e293b', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#06b6d4', marginBottom: 6 },
  modalSubtitle: { fontSize: 12, color: '#94a3b8', marginBottom: 20 },
  settingsList: { marginBottom: 18 },
  settingRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginBottom: 8,
  },
  settingLabelRow: { flexDirection: 'row', alignItems: 'center' },
  settingIcon: { fontSize: 18, marginRight: 10 },
  settingLabel: { fontSize: 15, color: '#fff', fontWeight: '600' },
  modalCloseBtn: { backgroundColor: '#06b6d4', borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  modalCloseBtnText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  settingDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  settingSectionTitle: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 8 },
  settingHint: { fontSize: 11, color: '#64748b', marginTop: 1 },
  voiceFreqContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  voiceOptionBtn: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 10,
    borderRadius: 12, alignItems: 'center', marginRight: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)'
  },
  voiceOptionBtnActive: { backgroundColor: 'rgba(217, 70, 239, 0.2)', borderColor: '#d946ef' },
  voiceOptionText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  voiceOptionTextActive: { color: '#fff' },
  customFreqInputWrapper: {
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginTop: 4, marginBottom: 12,
  },
  customFreqLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 },
  customFreqInput: { color: '#fff', fontSize: 14, padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10 },
});
