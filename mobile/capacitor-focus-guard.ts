// FocusGuard Plugin for Consumer-Safe Mobile Enforcement
// Uses Accessibility Service + Overlay + Usage Access instead of Device Owner privileges

import { Capacitor } from '@capacitor/core';

// Session configuration for focus enforcement
export interface FocusSession {
  allowedApps: string[];
  strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
  durationMinutes: number;
  sessionId: string;
}

// Permission status for different enforcement capabilities
export interface PermissionStatus {
  accessibility: boolean;
  overlay: boolean;
  usageAccess: boolean;
  notificationListener: boolean;
  batteryOptimization: boolean;
}

// Current enforcement state
export interface EnforcementState {
  isActive: boolean;
  currentSession: FocusSession | null;
  blockedAppAttempts: number;
  currentForegroundApp: string | null;
  sessionStartTime: number | null;
  timeRemaining: number | null;
}

// FocusGuard Plugin Interface - Consumer-safe enforcement
export interface FocusGuardPlugin {
  // Permission Management
  checkPermissions(): Promise<PermissionStatus>;
  requestPermissions(): Promise<{ success: boolean; granted: string[] }>;
  openPermissionSettings(options: { permission: 'accessibility' | 'overlay' | 'usageAccess' | 'batteryOptimization' }): Promise<void>;
  
  // Session Management
  startSession(options: FocusSession): Promise<{ success: boolean; sessionId: string }>;
  stopSession(): Promise<{ success: boolean }>;
  getSessionStatus(): Promise<EnforcementState>;
  
  // App Management (Consumer-Safe)
  getInstalledApps(): Promise<{ apps: Array<{ packageName: string; appName: string; icon?: string }> }>;
  getCurrentApp(): Promise<{ packageName: string | null }>;
  
  // Enforcement Actions (No Device Owner needed)
  showBlockOverlay(options: { packageName: string; message: string; allowDismiss: boolean }): Promise<{ success: boolean }>;
  hideBlockOverlay(): Promise<{ success: boolean }>;
  performHomeAction(): Promise<{ success: boolean }>;
  
  // Monitoring & Analytics
  getUsageStats(options: { hours: number }): Promise<{ apps: Array<{ packageName: string; timeSpent: number }> }>;
  
  // Background Service Management
  startBackgroundMonitoring(): Promise<{ success: boolean }>;
  stopBackgroundMonitoring(): Promise<{ success: boolean }>;
  isBackgroundMonitoringActive(): Promise<{ active: boolean }>;
}

// Custom Capacitor Plugin for FocusGuard
const FocusGuard = Capacitor.registerPlugin<FocusGuardPlugin>('FocusGuard');

// React Hook for FocusGuard (Consumer-Safe Enforcement)
export const useFocusGuard = () => {
  const isNativePlatform = Capacitor.isNativePlatform();
  
  const checkPermissions = async (): Promise<PermissionStatus> => {
    if (!isNativePlatform) {
      return {
        accessibility: false,
        overlay: false,
        usageAccess: false,
        notificationListener: false,
        batteryOptimization: false
      };
    }
    
    try {
      const result = await FocusGuard.checkPermissions();
      return result;
    } catch (error) {
      console.log('Permission check failed:', error);
      return {
        accessibility: false,
        overlay: false,
        usageAccess: false,
        notificationListener: false,
        batteryOptimization: false
      };
    }
  };

  const requestAllPermissions = async (): Promise<boolean> => {
    if (!isNativePlatform) {
      console.log('FocusGuard only available on native platforms');
      return false;
    }

    try {
      const result = await FocusGuard.requestPermissions();
      return result.success;
    } catch (error) {
      console.log('Permission request failed:', error);
      return false;
    }
  };

  const openPermissionSettings = async (permission: 'accessibility' | 'overlay' | 'usageAccess' | 'batteryOptimization'): Promise<void> => {
    if (!isNativePlatform) return;

    try {
      await FocusGuard.openPermissionSettings({ permission });
    } catch (error) {
      console.log('Failed to open permission settings:', error);
    }
  };

  const startEnforcementSession = async (session: Omit<FocusSession, 'sessionId'>): Promise<string | null> => {
    if (!isNativePlatform) return null;

    try {
      // Check permissions first
      const permissions = await checkPermissions();
      if (!permissions.accessibility || !permissions.overlay) {
        console.log('Required permissions not granted for enforcement');
        return null;
      }

      const sessionWithId: FocusSession = {
        ...session,
        sessionId: `session_${Date.now()}`
      };

      const result = await FocusGuard.startSession(sessionWithId);
      return result.success ? sessionWithId.sessionId : null;
    } catch (error) {
      console.log('Failed to start enforcement session:', error);
      return null;
    }
  };

  const stopEnforcementSession = async (): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const result = await FocusGuard.stopSession();
      return result.success;
    } catch (error) {
      console.log('Failed to stop enforcement session:', error);
      return false;
    }
  };

  const getSessionStatus = async (): Promise<EnforcementState | null> => {
    if (!isNativePlatform) return null;

    try {
      const result = await FocusGuard.getSessionStatus();
      return result;
    } catch (error) {
      console.log('Failed to get session status:', error);
      return null;
    }
  };

  const getInstalledApps = async (): Promise<Array<{ packageName: string; appName: string; icon?: string }>> => {
    if (!isNativePlatform) return [];

    try {
      const result = await FocusGuard.getInstalledApps();
      return result.apps;
    } catch (error) {
      console.log('Failed to get installed apps:', error);
      return [];
    }
  };

  const getCurrentRunningApp = async (): Promise<string | null> => {
    if (!isNativePlatform) return null;

    try {
      const result = await FocusGuard.getCurrentApp();
      return result.packageName;
    } catch (error) {
      console.log('Failed to get current app:', error);
      return null;
    }
  };

  const showAppBlockOverlay = async (packageName: string, allowDismiss: boolean = false): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const result = await FocusGuard.showBlockOverlay({
        packageName,
        message: 'Focus Mode Active - Return to allowed apps',
        allowDismiss
      });
      return result.success;
    } catch (error) {
      console.log('Failed to show block overlay:', error);
      return false;
    }
  };

  const hideAppBlockOverlay = async (): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const result = await FocusGuard.hideBlockOverlay();
      return result.success;
    } catch (error) {
      console.log('Failed to hide block overlay:', error);
      return false;
    }
  };

  const performHomeAction = async (): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const result = await FocusGuard.performHomeAction();
      return result.success;
    } catch (error) {
      console.log('Failed to perform home action:', error);
      return false;
    }
  };

  const startBackgroundMonitoring = async (): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const result = await FocusGuard.startBackgroundMonitoring();
      return result.success;
    } catch (error) {
      console.log('Failed to start background monitoring:', error);
      return false;
    }
  };

  const stopBackgroundMonitoring = async (): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const result = await FocusGuard.stopBackgroundMonitoring();
      return result.success;
    } catch (error) {
      console.log('Failed to stop background monitoring:', error);
      return false;
    }
  };

  const getUsageStats = async (hours: number = 24): Promise<Array<{ packageName: string; timeSpent: number }>> => {
    if (!isNativePlatform) return [];

    try {
      const result = await FocusGuard.getUsageStats({ hours });
      return result.apps;
    } catch (error) {
      console.log('Failed to get usage stats:', error);
      return [];
    }
  };

  return {
    isNativePlatform,
    // Permission management
    checkPermissions,
    requestAllPermissions,
    openPermissionSettings,
    // Session management
    startEnforcementSession,
    stopEnforcementSession,
    getSessionStatus,
    // App management
    getInstalledApps,
    getCurrentRunningApp,
    // Enforcement actions
    showAppBlockOverlay,
    hideAppBlockOverlay,
    performHomeAction,
    // Background monitoring
    startBackgroundMonitoring,
    stopBackgroundMonitoring,
    // Analytics
    getUsageStats
  };
};