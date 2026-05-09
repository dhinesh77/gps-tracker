import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet, Text, View, TextInput, TouchableOpacity,
  Dimensions, Platform, KeyboardAvoidingView, Keyboard,
  TouchableWithoutFeedback, Alert, ScrollView, StatusBar,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAppContext } from '../context/AppContext';

const TAB_BAR_HEIGHT = 64;

export default function DashboardScreen() {
  const ctx = useAppContext();
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimer = useRef(null);

  const {
    location, destination, setDestination, routeCoords,
    distanceKm, speed, averageSpeed, targetDate, setTargetDate,
    travelMode, setTravelMode, searchQuery, setSearchQuery,
    isNavigating, isPanelVisible, setIsPanelVisible,
    isMapScrolled, setIsMapScrolled,
    timeRemainingStr, requiredSpeedStr, formatTime, is24Hour,
    startNavigation, stopNavigation, resetAll, recenterMap,
    mapRef,
  } = ctx;

  const targetTimeDisplay = formatTime(targetDate);

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (event.type === 'set' && selectedDate) {
      setTargetDate(selectedDate);
    }
  };

  const handleMapPress = (e) => {
    if (isNavigating) return; // Don't set destination while navigating
    setDestination(e.nativeEvent.coordinate);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Fetch autocomplete suggestions from Nominatim (OpenStreetMap) — free, no API key
  const fetchSuggestions = useCallback((text) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimer.current = setTimeout(async () => {
      try {
        const viewbox = location
          ? `&viewbox=${location.longitude - 0.5},${location.latitude + 0.5},${location.longitude + 0.5},${location.latitude - 0.5}&bounded=0`
          : '';
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&limit=5&addressdetails=1${viewbox}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'GPSTrackerApp/1.0',
            'Accept-Language': 'en',
          },
        });
        const data = await response.json();

        if (data && data.length > 0) {
          const mapped = data.map((item, idx) => ({
            id: item.place_id || idx.toString(),
            display_name: item.display_name,
            name: item.name || item.display_name.split(',')[0],
            secondary: item.display_name.split(',').slice(1, 3).join(',').trim(),
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          }));
          setSuggestions(mapped);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (e) {
        console.warn('Autocomplete error:', e);
      }
    }, 400);
  }, [location]);

  // Handle selecting a suggestion — Nominatim returns lat/lon directly
  const selectSuggestion = (item) => {
    setSuggestions([]);
    setShowSuggestions(false);
    setSearchQuery(item.display_name);
    Keyboard.dismiss();

    const dest = { latitude: item.lat, longitude: item.lon };
    setDestination(dest);
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: item.lat,
        longitude: item.lon,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const handleSearchTextChange = (text) => {
    setSearchQuery(text);
    fetchSuggestions(text);
  };

  const searchDestination = async () => {
    if (!searchQuery.trim()) return;
    setSuggestions([]);
    setShowSuggestions(false);
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

  const hasAnyChanges = destination !== null || targetDate !== null || searchQuery.trim() !== '';

  // Display speed: show average during navigation, current otherwise
  const displaySpeed = isNavigating && averageSpeed > 0 ? averageSpeed : speed;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
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
              <Text style={{ color: 'white', fontSize: 16 }}>Waiting for GPS...</Text>
            </View>
          )}

          {isMapScrolled && (
            <TouchableOpacity onPress={recenterMap} style={styles.myLocationBtn}>
              <Text style={{ fontSize: 22 }}>🧭</Text>
            </TouchableOpacity>
          )}

          {hasAnyChanges && !isNavigating && (
            <TouchableOpacity onPress={resetAll} style={styles.clearBtn}>
              <Text style={{ fontSize: 12, color: 'white', fontWeight: 'bold' }}>✖ CLEAR ALL</Text>
            </TouchableOpacity>
          )}

          {/* Floating Navigation Info Bar — shown during active navigation */}
          {isNavigating && (
            <TouchableOpacity
              style={styles.navInfoBar}
              onPress={() => setIsPanelVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.navInfoItem}>
                <Text style={styles.navInfoLabel}>Speed</Text>
                <Text style={styles.navInfoValue}>{displaySpeed.toFixed(1)}</Text>
                <Text style={styles.navInfoUnit}>km/h</Text>
              </View>
              <View style={styles.navInfoDivider} />
              <View style={styles.navInfoItem}>
                <Text style={styles.navInfoLabel}>Distance</Text>
                <Text style={styles.navInfoValue}>{distanceKm.toFixed(1)}</Text>
                <Text style={styles.navInfoUnit}>km</Text>
              </View>
              <View style={styles.navInfoDivider} />
              <View style={styles.navInfoItem}>
                <Text style={styles.navInfoLabel}>ETA</Text>
                <Text style={styles.navInfoValueSmall}>{timeRemainingStr}</Text>
              </View>
              <View style={styles.navInfoDivider} />
              <TouchableOpacity
                style={styles.navStopBtn}
                onPress={stopNavigation}
              >
                <Text style={styles.navStopText}>🛑</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}

          <View style={[styles.dashboard, !isPanelVisible && styles.dashboardCollapsed]}>
            {isPanelVisible ? (
              <>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>Travel Tracker</Text>
                  <TouchableOpacity onPress={() => setIsPanelVisible(false)} style={styles.iconBtn}>
                    <Text style={{ fontSize: 20 }}>◀️</Text>
                  </TouchableOpacity>
                </View>

              <ScrollView style={styles.dashboardScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" nestedScrollEnabled={true}>
                <View style={{ zIndex: 10, marginBottom: 12 }}>
                  <View style={styles.searchRow}>
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Search for destination..."
                      placeholderTextColor="#94a3b8"
                      value={searchQuery}
                      onChangeText={handleSearchTextChange}
                      onSubmitEditing={searchDestination}
                      onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                    />
                    <TouchableOpacity style={styles.searchBtn} onPress={searchDestination}>
                      <Text style={{ fontSize: 16, color: '#0f172a', fontWeight: 'bold' }}>🔍</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Suggestions Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <View style={styles.suggestionsContainer}>
                      {suggestions.map((item, index) => (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.suggestionItem,
                            index < suggestions.length - 1 && styles.suggestionDivider,
                          ]}
                          onPress={() => selectSuggestion(item)}
                          activeOpacity={0.6}
                        >
                          <Text style={styles.suggestionIcon}>📍</Text>
                          <View style={styles.suggestionTextContainer}>
                            <Text style={styles.suggestionMainText} numberOfLines={1}>
                              {item.name}
                            </Text>
                            <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                              {item.secondary}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
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
                    <Text style={styles.label}>Speed{isNavigating ? ' (avg)' : ''}</Text>
                    <Text style={styles.value}>{displaySpeed.toFixed(1)} <Text style={styles.unit}>km/h</Text></Text>
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
                    <Text style={[styles.valueSmall, !targetDate && { color: '#94a3b8' }]}>{targetTimeDisplay}</Text>
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

                {destination && (
                  <TouchableOpacity
                    style={[styles.startNavBtn, isNavigating && styles.stopNavBtn]}
                    onPress={() => {
                      if (isNavigating) {
                        stopNavigation();
                      } else {
                        startNavigation();
                      }
                    }}
                  >
                    <Text style={styles.startNavText}>
                      {isNavigating ? '🛑 STOP NAVIGATION' : '🚀 START NAVIGATION'}
                    </Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              </>
            ) : (
              !isNavigating && (
                <TouchableOpacity onPress={() => setIsPanelVisible(true)} style={styles.pullTabBtn}>
                  <Text style={{ fontSize: 22 }}>▶️</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  myLocationBtn: {
    position: 'absolute', top: (StatusBar.currentHeight || 44) + 10, right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 12, borderRadius: 28,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },
  clearBtn: {
    position: 'absolute', top: (StatusBar.currentHeight || 44) + 10, left: 20,
    backgroundColor: 'rgba(225, 29, 72, 0.85)',
    paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },

  // Floating Navigation Info Bar
  navInfoBar: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 12,
    left: 12, right: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    elevation: 10,
  },
  navInfoItem: {
    flex: 1,
    alignItems: 'center',
  },
  navInfoLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  navInfoValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  navInfoValueSmall: {
    fontSize: 13,
    color: '#06b6d4',
    fontWeight: 'bold',
  },
  navInfoUnit: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
  },
  navInfoDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 4,
  },
  navStopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  navStopText: {
    fontSize: 18,
  },

  dashboard: {
    position: 'absolute', bottom: TAB_BAR_HEIGHT, left: 0, right: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.92)', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', borderBottomWidth: 0,
    maxHeight: Dimensions.get('window').height * 0.55,
  },
  dashboardScroll: {
    flexGrow: 0,
  },
  dashboardCollapsed: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)', width: 64, height: 64,
    bottom: TAB_BAR_HEIGHT + 12, left: 'auto', right: 20,
    padding: 0, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#06b6d4', elevation: 10,
  },
  pullTabBtn: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 0,
    borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  searchInput: { flex: 1, height: 44, color: '#fff', fontSize: 14, paddingRight: 8 },
  searchBtn: { backgroundColor: '#06b6d4', padding: 10, borderRadius: 12 },

  // Suggestions dropdown
  suggestionsContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.98)',
    borderRadius: 14,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    elevation: 10,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  suggestionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 11,
    color: '#64748b',
  },

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
});
