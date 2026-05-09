import React, { useState, useEffect, useRef } from 'react';
import { Animated, View, Text, Image, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { AppProvider } from '../context/AppContext';

function SplashScreen({ onFinish }) {
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
        onFinish();
      }, 1500);
    });
  }, []);

  return (
    <View style={splashStyles.container}>
      <Animated.View style={[splashStyles.content, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image source={require('../assets/images/react-logo.png')} style={splashStyles.icon} />
        <Text style={splashStyles.title}>GPS Tracker</Text>
        <Text style={splashStyles.subtitle}>ROAD-AWARE NAVIGATION</Text>
      </Animated.View>
    </View>
  );
}

const splashStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center' },
  content: { alignItems: 'center' },
  icon: { width: 120, height: 120, borderRadius: 28, marginBottom: 24, borderWidth: 1, borderColor: '#06b6d4' },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 },
  subtitle: { fontSize: 11, color: '#06b6d4', fontWeight: '800', letterSpacing: 3, marginTop: 8 },
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  if (!isReady) {
    return <SplashScreen onFinish={() => setIsReady(true)} />;
  }

  return (
    <AppProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0f172a',
            borderTopWidth: 1,
            borderTopColor: 'rgba(255, 255, 255, 0.08)',
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarActiveTintColor: '#06b6d4',
          tabBarInactiveTintColor: '#64748b',
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            letterSpacing: 0.3,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size || 22, color }}>🏠</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="history"
          options={{
            title: 'History',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size || 22, color }}>📋</Text>
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => (
              <Text style={{ fontSize: size || 22, color }}>⚙️</Text>
            ),
          }}
        />
      </Tabs>
    </AppProvider>
  );
}
