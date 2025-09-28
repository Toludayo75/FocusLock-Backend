// Comprehensive Permission Manager for Mobile Enforcement
// Handles all required permissions with progressive onboarding

import { useState, useEffect, useCallback } from 'react';
import { useFocusGuard } from '../../../mobile/capacitor-focus-guard';

export interface PermissionInfo {
  key: string;
  name: string;
  description: string;
  required: boolean;
  impact: string;
  settingsPath: string;
  userFriendlySteps: string[];
}

export interface PermissionState {
  isGranted: boolean;
  canRequest: boolean;
  requiresManualSetup: boolean;
  lastChecked: number;
}

export interface PermissionManagerState {
  permissions: Record<string, PermissionState>;
  overallStatus: 'none' | 'partial' | 'complete';
  coreEnforcementReady: boolean;
  backgroundServiceReady: boolean;
  isLoading: boolean;
  lastFullCheck: number;
}

// Permission definitions with user-friendly information
const PERMISSION_DEFINITIONS: Record<string, PermissionInfo> = {
  accessibility: {
    key: 'accessibility',
    name: 'Accessibility Service',
    description: 'Monitor and control app usage during focus sessions',
    required: true,
    impact: 'Core enforcement feature - without this, FocusLock cannot block distracting apps',
    settingsPath: 'Settings > Accessibility > FocusLock',
    userFriendlySteps: [
      'Open your phone\'s Settings app',
      'Scroll down and tap "Accessibility"',
      'Find "FocusLock" in the list',
      'Tap the toggle to turn it ON',
      'Confirm by tapping "Allow" in the popup'
    ]
  },
  overlay: {
    key: 'overlay',
    name: 'Display Over Other Apps',
    description: 'Show blocking screens when you try to open restricted apps',
    required: true,
    impact: 'Visual enforcement - shows "Focus Mode Active" overlay when you access blocked apps',
    settingsPath: 'Settings > Apps > Special Access > Display over other apps',
    userFriendlySteps: [
      'Open your phone\'s Settings app',
      'Go to "Apps" or "Application Manager"',
      'Tap "Special Access" or "Advanced"',
      'Select "Display over other apps"',
      'Find "FocusLock" and toggle it ON'
    ]
  },
  usageAccess: {
    key: 'usageAccess',
    name: 'Usage Access',
    description: 'Track which apps you\'re using to enforce focus sessions',
    required: true,
    impact: 'App monitoring - lets FocusLock detect when you switch to blocked apps',
    settingsPath: 'Settings > Apps > Special Access > Usage access',
    userFriendlySteps: [
      'Open your phone\'s Settings app',
      'Go to "Apps" or "Application Manager"',
      'Tap "Special Access" or "Advanced"',
      'Select "Usage access" or "Usage data access"',
      'Find "FocusLock" and toggle it ON'
    ]
  },
  batteryOptimization: {
    key: 'batteryOptimization',
    name: 'Battery Optimization Exemption',
    description: 'Keep FocusLock running in the background during focus sessions',
    required: true,
    impact: 'Background enforcement - prevents Android from stopping FocusLock during active sessions',
    settingsPath: 'Settings > Battery > Battery optimization',
    userFriendlySteps: [
      'Open your phone\'s Settings app',
      'Go to "Battery" or "Device care"',
      'Tap "Battery optimization" or "App power management"',
      'Find "FocusLock" in the list',
      'Select "Don\'t optimize" or "No restrictions"'
    ]
  },
  notificationListener: {
    key: 'notificationListener',
    name: 'Notification Access',
    description: 'Manage focus-related notifications during sessions',
    required: false,
    impact: 'Enhanced focus - can silence distracting notifications during focus sessions',
    settingsPath: 'Settings > Apps > Special Access > Notification access',
    userFriendlySteps: [
      'Open your phone\'s Settings app',
      'Go to "Apps" or "Application Manager"',
      'Tap "Special Access" or "Advanced"',
      'Select "Notification access"',
      'Find "FocusLock" and toggle it ON'
    ]
  }
};

export const usePermissionManager = () => {
  const focusGuard = useFocusGuard();
  
  const [state, setState] = useState<PermissionManagerState>({
    permissions: {},
    overallStatus: 'none',
    coreEnforcementReady: false,
    backgroundServiceReady: false,
    isLoading: false,
    lastFullCheck: 0
  });

  // Initialize permission state
  const initializePermissions = useCallback(() => {
    const initialPermissions: Record<string, PermissionState> = {};
    
    Object.keys(PERMISSION_DEFINITIONS).forEach(key => {
      initialPermissions[key] = {
        isGranted: false,
        canRequest: true,
        requiresManualSetup: true, // All these permissions require manual setup
        lastChecked: 0
      };
    });

    setState(prev => ({
      ...prev,
      permissions: initialPermissions
    }));
  }, []);

  // Check all permissions status
  const checkAllPermissions = useCallback(async (): Promise<PermissionManagerState> => {
    if (!focusGuard.isNativePlatform) {
      return state; // Return current state for web
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      // Get current permission status from native plugin
      const permissionStatus = await focusGuard.checkPermissions();
      const now = Date.now();
      
      const updatedPermissions: Record<string, PermissionState> = {};
      
      // Map native permission status to our permission state
      updatedPermissions.accessibility = {
        isGranted: permissionStatus.accessibility,
        canRequest: false, // Must be done manually
        requiresManualSetup: true,
        lastChecked: now
      };
      
      updatedPermissions.overlay = {
        isGranted: permissionStatus.overlay,
        canRequest: false, // Must be done manually
        requiresManualSetup: true,
        lastChecked: now
      };
      
      updatedPermissions.usageAccess = {
        isGranted: permissionStatus.usageAccess,
        canRequest: false, // Must be done manually
        requiresManualSetup: true,
        lastChecked: now
      };
      
      updatedPermissions.batteryOptimization = {
        isGranted: permissionStatus.batteryOptimization,
        canRequest: true, // Can be requested programmatically
        requiresManualSetup: false,
        lastChecked: now
      };
      
      updatedPermissions.notificationListener = {
        isGranted: permissionStatus.notificationListener,
        canRequest: false, // Must be done manually
        requiresManualSetup: true,
        lastChecked: now
      };

      // Calculate overall status
      const requiredPermissions = Object.entries(PERMISSION_DEFINITIONS)
        .filter(([_, info]) => info.required)
        .map(([key]) => key);
      
      const grantedRequired = requiredPermissions.filter(key => 
        updatedPermissions[key]?.isGranted
      ).length;
      
      let overallStatus: 'none' | 'partial' | 'complete' = 'none';
      if (grantedRequired === requiredPermissions.length) {
        overallStatus = 'complete';
      } else if (grantedRequired > 0) {
        overallStatus = 'partial';
      }

      // Check core enforcement readiness
      const coreEnforcementReady = 
        updatedPermissions.accessibility?.isGranted &&
        updatedPermissions.overlay?.isGranted &&
        updatedPermissions.usageAccess?.isGranted;

      // Check background service readiness
      const backgroundServiceReady = 
        coreEnforcementReady && updatedPermissions.batteryOptimization?.isGranted;

      const newState: PermissionManagerState = {
        permissions: updatedPermissions,
        overallStatus,
        coreEnforcementReady: !!coreEnforcementReady,
        backgroundServiceReady: !!backgroundServiceReady,
        isLoading: false,
        lastFullCheck: now
      };

      setState(newState);
      return newState;
      
    } catch (error) {
      console.error('Failed to check permissions:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return state;
    }
  }, [focusGuard, state]);

  // Request a specific permission
  const requestPermission = useCallback(async (permissionKey: string): Promise<boolean> => {
    if (!focusGuard.isNativePlatform) {
      return false;
    }

    const permissionInfo = PERMISSION_DEFINITIONS[permissionKey];
    if (!permissionInfo) {
      console.error('Unknown permission:', permissionKey);
      return false;
    }

    try {
      if (permissionKey === 'batteryOptimization') {
        // Battery optimization can be requested programmatically
        const result = await focusGuard.requestBatteryOptimizationExemption();
        if (result) {
          // Update local state
          setState(prev => ({
            ...prev,
            permissions: {
              ...prev.permissions,
              [permissionKey]: {
                ...prev.permissions[permissionKey],
                isGranted: true,
                lastChecked: Date.now()
              }
            }
          }));
        }
        return result;
      } else {
        // Other permissions require manual setup - open settings
        await focusGuard.openPermissionSettings(permissionKey as any);
        return false; // User needs to manually grant
      }
    } catch (error) {
      console.error(`Failed to request permission ${permissionKey}:`, error);
      return false;
    }
  }, [focusGuard]);

  // Open settings for a specific permission
  const openPermissionSettings = useCallback(async (permissionKey: string): Promise<void> => {
    if (!focusGuard.isNativePlatform) {
      return;
    }

    try {
      await focusGuard.openPermissionSettings(permissionKey as any);
    } catch (error) {
      console.error(`Failed to open settings for ${permissionKey}:`, error);
    }
  }, [focusGuard]);

  // Get permission information
  const getPermissionInfo = useCallback((permissionKey: string): PermissionInfo | null => {
    return PERMISSION_DEFINITIONS[permissionKey] || null;
  }, []);

  // Get permissions that still need to be granted
  const getMissingPermissions = useCallback((): string[] => {
    return Object.entries(state.permissions)
      .filter(([key, permState]) => {
        const info = PERMISSION_DEFINITIONS[key];
        return info?.required && !permState.isGranted;
      })
      .map(([key]) => key);
  }, [state.permissions]);

  // Get permissions that can be requested automatically
  const getRequestablePermissions = useCallback((): string[] => {
    return Object.entries(state.permissions)
      .filter(([key, permState]) => {
        const info = PERMISSION_DEFINITIONS[key];
        return info?.required && !permState.isGranted && permState.canRequest;
      })
      .map(([key]) => key);
  }, [state.permissions]);

  // Request all possible permissions automatically
  const requestAllAutomaticPermissions = useCallback(async (): Promise<boolean> => {
    const requestable = getRequestablePermissions();
    let allGranted = true;

    for (const permissionKey of requestable) {
      const granted = await requestPermission(permissionKey);
      if (!granted) {
        allGranted = false;
      }
    }

    // Refresh status after requests
    await checkAllPermissions();
    
    return allGranted;
  }, [getRequestablePermissions, requestPermission, checkAllPermissions]);

  // Initialize on mount
  useEffect(() => {
    initializePermissions();
    checkAllPermissions();
  }, [initializePermissions, checkAllPermissions]);

  // Refresh permissions when app comes to foreground (mobile)
  useEffect(() => {
    if (!focusGuard.isNativePlatform) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App came to foreground, refresh permissions
        checkAllPermissions();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [focusGuard.isNativePlatform, checkAllPermissions]);

  return {
    // State
    ...state,
    
    // Permission information
    getPermissionInfo,
    getAllPermissionDefinitions: () => PERMISSION_DEFINITIONS,
    getMissingPermissions,
    getRequestablePermissions,
    
    // Actions
    checkAllPermissions,
    requestPermission,
    requestAllAutomaticPermissions,
    openPermissionSettings,
    
    // Utilities
    isNativePlatform: focusGuard.isNativePlatform
  };
};