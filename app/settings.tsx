import React, { useState } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch, TextInput, Modal, Linking,
} from 'react-native';
import { useAppContext } from '../context/AppContext';

const APP_VERSION = '1.0.0';
const DEVELOPER = 'dhinesh77';

const CARD_OPTIONS = [
  { key: 'speed', label: 'Current Speed', icon: '⚡' },
  { key: 'distance', label: 'Distance', icon: '📏' },
  { key: 'requiredSpeed', label: 'Required Speed', icon: '🎯' },
  { key: 'timeRemaining', label: 'Time Remaining', icon: '⏱' },
];

export default function SettingsScreen() {
  const {
    cardSettings, updateCardSetting,
    is24Hour, updateIs24Hour,
    voiceFreq, updateVoiceFreq,
    customVoiceFreq, saveCustomVoiceFreq,
  } = useAppContext();

  const [showAbout, setShowAbout] = useState(false);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Customize your experience</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>

        {/* Floating Dashboard Metrics Section */}
        <Text style={styles.sectionTitle}>FLOATING DASHBOARD METRICS</Text>
        <View style={styles.sectionCard}>
          {CARD_OPTIONS.map((option, index) => (
            <View key={option.key}>
              <View style={styles.settingRow}>
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
              {index < CARD_OPTIONS.length - 1 && <View style={styles.rowDivider} />}
            </View>
          ))}
        </View>

        {/* General Section */}
        <Text style={styles.sectionTitle}>GENERAL</Text>
        <View style={styles.sectionCard}>
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
              onValueChange={updateIs24Hour}
              trackColor={{ false: '#334155', true: '#06b6d4' }}
              thumbColor={is24Hour ? '#fff' : '#94a3b8'}
            />
          </View>
        </View>

        {/* Voice Alerts Section */}
        <Text style={styles.sectionTitle}>VOICE ALERTS</Text>
        <View style={styles.sectionCard}>
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
            <>
              <View style={styles.rowDivider} />
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
            </>
          )}
        </View>

        {/* About Section */}
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity style={styles.settingRow} onPress={() => setShowAbout(true)} activeOpacity={0.6}>
            <View style={styles.settingLabelRow}>
              <Text style={styles.settingIcon}>ℹ️</Text>
              <Text style={styles.settingLabel}>About GPS Tracker</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* About Modal */}
      <Modal
        visible={showAbout}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAbout(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.aboutHeader}>
              <Text style={styles.aboutAppIcon}>📍</Text>
              <Text style={styles.aboutAppName}>GPS Tracker</Text>
              <Text style={styles.aboutTagline}>ROAD-AWARE NAVIGATION</Text>
              <View style={styles.versionBadge}>
                <Text style={styles.versionText}>v{APP_VERSION}</Text>
              </View>
            </View>

            <View style={styles.aboutDivider} />

            <View style={styles.aboutInfoSection}>
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Developer</Text>
                <Text style={styles.aboutValue}>{DEVELOPER}</Text>
              </View>
              <View style={styles.aboutRowDivider} />
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Platform</Text>
                <Text style={styles.aboutValue}>React Native / Expo</Text>
              </View>
              <View style={styles.aboutRowDivider} />
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Maps</Text>
                <Text style={styles.aboutValue}>Google Maps + OSRM</Text>
              </View>
              <View style={styles.aboutRowDivider} />
              <View style={styles.aboutRow}>
                <Text style={styles.aboutLabel}>Build</Text>
                <Text style={styles.aboutValue}>Expo SDK 54</Text>
              </View>
            </View>

            <View style={styles.aboutDivider} />

            <Text style={styles.aboutDescription}>
              GPS Tracker provides real-time road-aware navigation with speed tracking,
              distance calculation, and voice alerts. Features include a floating dashboard,
              background location tracking, and multi-mode routing.
            </Text>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setShowAbout(false)}
            >
              <Text style={styles.modalCloseBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    paddingTop: 56,
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

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  sectionTitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
    marginLeft: 4,
    marginTop: 8,
  },

  sectionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },

  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  settingHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#64748b',
    fontWeight: '300',
  },

  rowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Voice Alerts
  voiceFreqContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 8,
  },
  voiceOptionBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  voiceOptionBtnActive: {
    backgroundColor: 'rgba(217, 70, 239, 0.2)',
    borderColor: '#d946ef',
  },
  voiceOptionText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  voiceOptionTextActive: { color: '#fff' },

  customFreqInputWrapper: {
    paddingVertical: 12,
  },
  customFreqLabel: {
    fontSize: 11,
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 8,
    fontWeight: '600',
  },
  customFreqInput: {
    color: '#fff',
    fontSize: 14,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },

  // About Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },

  aboutHeader: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  aboutAppIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  aboutAppName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  aboutTagline: {
    fontSize: 10,
    color: '#06b6d4',
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 12,
  },
  versionBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#06b6d4',
  },

  aboutDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 16,
  },

  aboutInfoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  aboutRowDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  aboutLabel: {
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  aboutValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },

  aboutDescription: {
    fontSize: 13,
    color: '#94a3b8',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },

  modalCloseBtn: {
    backgroundColor: '#06b6d4',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
