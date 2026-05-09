import React from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert, StatusBar, Image,
} from 'react-native';
import { useAppContext } from '../context/AppContext';

export default function HistoryScreen() {
  const { navigationHistory, deleteHistoryItem, clearAllHistory } = useAppContext();

  const getModeIcon = (mode) => {
    switch (mode) {
      case 'driving': return '🚗';
      case 'cycling': return '🚲';
      case 'walking': return '🚶';
      default: return '📍';
    }
  };

  const formatDate = (isoStr) => {
    const d = new Date(isoStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return { date: `${day} ${month} ${year}`, time: `${hours}:${mins}` };
  };

  const getDuration = (startStr, endStr) => {
    const diff = (new Date(endStr) - new Date(startStr)) / 1000;
    const hrs = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleDelete = (id) => {
    Alert.alert(
      'Delete Trip',
      'Are you sure you want to remove this trip from history?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteHistoryItem(id) },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear All History',
      'This will permanently delete all navigation history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearAllHistory },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Navigation History</Text>
        <Text style={styles.headerSubtitle}>
          {navigationHistory.length} {navigationHistory.length === 1 ? 'trip' : 'trips'} recorded
        </Text>
      </View>

      {navigationHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyTitle}>No trips recorded yet</Text>
          <Text style={styles.emptySubtitle}>
            Start a navigation from the Dashboard tab{'\n'}and your trips will appear here
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {navigationHistory.map((trip) => {
            const start = formatDate(trip.startTime);
            const end = formatDate(trip.endTime);
            const duration = getDuration(trip.startTime, trip.endTime);

            return (
              <TouchableOpacity
                key={trip.id}
                style={styles.tripCard}
                onLongPress={() => handleDelete(trip.id)}
                activeOpacity={0.7}
              >
                <View style={styles.tripHeader}>
                  <View style={styles.tripModeIconContainer}>
                    <Text style={styles.tripModeIcon}>{getModeIcon(trip.travelMode)}</Text>
                  </View>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripDestination} numberOfLines={1}>
                      {trip.destinationName || 'Unknown destination'}
                    </Text>
                    <Text style={styles.tripDate}>{start.date}</Text>
                  </View>
                  <View style={styles.tripDistanceBadge}>
                    <Text style={styles.tripDistanceText}>{trip.distance.toFixed(1)} km</Text>
                  </View>
                </View>

                {/* Route Map Image */}
                {trip.routeImageUri && (
                  <View style={styles.routeImageContainer}>
                    <Image
                      source={{ uri: trip.routeImageUri }}
                      style={styles.routeImage}
                      resizeMode="cover"
                    />
                  </View>
                )}

                <View style={styles.tripDetails}>
                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>Start</Text>
                    <Text style={styles.tripDetailValue}>{start.time}</Text>
                  </View>
                  <View style={styles.tripDetailDivider} />
                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>End</Text>
                    <Text style={styles.tripDetailValue}>{end.time}</Text>
                  </View>
                  <View style={styles.tripDetailDivider} />
                  <View style={styles.tripDetailItem}>
                    <Text style={styles.tripDetailLabel}>Duration</Text>
                    <Text style={styles.tripDetailValue}>{duration}</Text>
                  </View>
                  {trip.averageSpeed > 0 && (
                    <>
                      <View style={styles.tripDetailDivider} />
                      <View style={styles.tripDetailItem}>
                        <Text style={styles.tripDetailLabel}>Avg Speed</Text>
                        <Text style={styles.tripDetailValue}>{trip.averageSpeed.toFixed(1)}</Text>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
            <Text style={styles.clearAllText}>🗑️  Clear All History</Text>
          </TouchableOpacity>

          <View style={{ height: 30 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: (StatusBar.currentHeight || 44) + 16,
    paddingHorizontal: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  // Empty state
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
  },

  // List
  list: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Trip card
  tripCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  tripHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  tripModeIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tripModeIcon: {
    fontSize: 22,
  },
  tripInfo: {
    flex: 1,
  },
  tripDestination: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  tripDate: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  tripDistanceBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  tripDistanceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#06b6d4',
  },

  // Route image
  routeImageContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  routeImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },

  tripDetails: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  tripDetailItem: {
    flex: 1,
    alignItems: 'center',
  },
  tripDetailLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 4,
  },
  tripDetailValue: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '700',
  },
  tripDetailDivider: {
    width: 1,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  // Clear all
  clearAllBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    alignItems: 'center',
  },
  clearAllText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '700',
  },
});
