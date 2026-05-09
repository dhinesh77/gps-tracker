import { requireNativeModule } from 'expo-modules-core';

let ExpoFloatingWindow = null;
try {
  ExpoFloatingWindow = requireNativeModule('ExpoFloatingWindow');
} catch (e) {
  console.warn("Native floating window module not found. This is expected if running in Expo Go.");
}

export function showFloatingWindow(speed, distance, requiredSpeed, timeRemaining) {
  if (ExpoFloatingWindow) {
    return ExpoFloatingWindow.showFloatingWindow(speed, distance, requiredSpeed, timeRemaining);
  }
}

export function hideFloatingWindow() {
  if (ExpoFloatingWindow) {
    return ExpoFloatingWindow.hideFloatingWindow();
  }
}

export function canDrawOverlays() {
  if (ExpoFloatingWindow) {
    return ExpoFloatingWindow.canDrawOverlays();
  }
  return false;
}

export function openOverlaySettings() {
  if (ExpoFloatingWindow) {
    return ExpoFloatingWindow.openOverlaySettings();
  }
}
