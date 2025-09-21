// Mobile Enforcement Hook for FocusLock
// UNCOMMENT AND USE WHEN CONVERTING TO CAPACITOR + ANDROID

import { useDeviceAdmin } from '../../../mobile/capacitor-device-admin';
import { useState, useEffect } from 'react';

export interface EnforcementState {
  isActive: boolean;
  isDeviceAdminEnabled: boolean;
  strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
  targetApps: string[];
  blockedApps: string[];
  currentApp: string | null;
}

export const useMobileEnforcement = () => {
  const [enforcementState, setEnforcementState] = useState<EnforcementState>({
    isActive: false,
    isDeviceAdminEnabled: false,
    strictLevel: 'MEDIUM',
    targetApps: [],
    blockedApps: [],
    currentApp: null
  });

  // Enable Capacitor device admin functionality
  const deviceAdmin = useDeviceAdmin();

  const checkDeviceAdminStatus = async (): Promise<boolean> => {
    // MOBILE VERSION:
    if (deviceAdmin.isNativePlatform) {
      const isActive = await deviceAdmin.checkDeviceAdminStatus();
      setEnforcementState(prev => ({ ...prev, isDeviceAdminEnabled: isActive }));
      return isActive;
    }
    
    // WEB VERSION: Always return false
    return false;
  };

  const requestDeviceAdminPermission = async (): Promise<boolean> => {
    // MOBILE VERSION:
    if (deviceAdmin.isNativePlatform) {
      const granted = await deviceAdmin.requestDeviceAdminPermission();
      if (granted) {
        setEnforcementState(prev => ({ ...prev, isDeviceAdminEnabled: true }));
      }
      return granted;
    }
    
    // WEB VERSION: Show info toast
    console.log('Device admin only available on mobile app');
    return false;
  };

  const startEnforcement = async (taskData: {
    strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
    targetApps: string[];
    durationMinutes: number;
  }): Promise<boolean> => {
    // MOBILE VERSION:
    if (deviceAdmin.isNativePlatform) {
      const isAdminActive = await checkDeviceAdminStatus();
      if (!isAdminActive) {
        const granted = await requestDeviceAdminPermission();
        if (!granted) return false;
      }
      
      // 🚀 NEW: Set up app restrictions
      const restrictionSuccess = await deviceAdmin.setAppUsageRestrictions(
        taskData.targetApps, 
        taskData.strictLevel
      );
      
      if (!restrictionSuccess) {
        console.log('Failed to set app restrictions');
        return false;
      }
      
      // Get all installed apps to determine which ones to block
      const installedApps = await deviceAdmin.getInstalledApps();
      const appsToBlock = installedApps
        .filter(app => !taskData.targetApps.includes(app.packageName))
        .map(app => app.packageName);
      
      // Block non-target apps based on strict level
      const blockedApps: string[] = [];
      if (taskData.strictLevel !== 'SOFT') {
        for (const packageName of appsToBlock) {
          // Skip system apps that shouldn't be blocked
          if (!isSystemApp(packageName)) {
            const blocked = await deviceAdmin.setAppBlocked(packageName, true);
            if (blocked) {
              blockedApps.push(packageName);
            }
          }
        }
      }
      
      setEnforcementState({
        isActive: true,
        isDeviceAdminEnabled: true,
        strictLevel: taskData.strictLevel,
        targetApps: taskData.targetApps,
        blockedApps,
        currentApp: null
      });
      
      // Disable camera for MEDIUM and HARD levels
      if (taskData.strictLevel !== 'SOFT') {
        await deviceAdmin.disableCamera(true);
      }
      
      // Start monitoring current app
      startAppMonitoring();
      
      console.log(`✅ Enforcement started: ${blockedApps.length} apps blocked, ${taskData.targetApps.length} apps allowed`);
      return true;
    }

    // WEB VERSION: Just update state for demo
    setEnforcementState({
      isActive: true,
      isDeviceAdminEnabled: false,
      strictLevel: taskData.strictLevel,
      targetApps: taskData.targetApps,
      blockedApps: [],
      currentApp: null
    });
    
    console.log('Enforcement started (web demo mode):', taskData);
    return true;
  };

  const stopEnforcement = async (): Promise<void> => {
    // MOBILE VERSION:
    if (deviceAdmin.isNativePlatform && enforcementState.isDeviceAdminEnabled) {
      // 🚀 NEW: Unblock all previously blocked apps
      for (const packageName of enforcementState.blockedApps) {
        await deviceAdmin.setAppBlocked(packageName, false);
      }
      
      // Re-enable camera
      await deviceAdmin.disableCamera(false);
      
      // Stop app monitoring
      stopAppMonitoring();
    }

    setEnforcementState(prev => ({ 
      ...prev, 
      isActive: false,
      strictLevel: 'MEDIUM',
      targetApps: [],
      blockedApps: [],
      currentApp: null
    }));
    
    console.log('Enforcement stopped - all apps unblocked');
  };

  const enforceRestriction = async (): Promise<void> => {
    if (!enforcementState.isActive) return;

    // MOBILE VERSION:
    if (deviceAdmin.isNativePlatform && enforcementState.isDeviceAdminEnabled) {
      const currentApp = await deviceAdmin.getCurrentRunningApp();
      
      // Check if current app is blocked
      if (currentApp && enforcementState.blockedApps.includes(currentApp)) {
        console.log(`🚫 Blocked app detected: ${currentApp}`);
        
        switch (enforcementState.strictLevel) {
          case 'SOFT':
            // Show notification but don't lock (handled by app UI)
            console.log('⚠️ Soft restriction: Please return to allowed apps');
            break;
          case 'MEDIUM':
            // Lock device after 10 second grace period
            console.log('⏰ Medium restriction: 10 seconds to switch apps');
            setTimeout(async () => {
              await deviceAdmin.lockDevice();
            }, 10000);
            break;
          case 'HARD':
            // Lock device immediately
            console.log('🔒 Hard restriction: Device locked immediately');
            await deviceAdmin.lockDevice();
            break;
        }
      }
    } else {
      // WEB VERSION: Show console message
      console.log(`Enforcement triggered: ${enforcementState.strictLevel} level`);
    }
  };

  // 🚀 NEW: App Monitoring System
  let monitoringInterval: NodeJS.Timeout | null = null;

  const startAppMonitoring = () => {
    if (!deviceAdmin.isNativePlatform) return;
    
    // Monitor current app every 2 seconds
    monitoringInterval = setInterval(async () => {
      const currentApp = await deviceAdmin.getCurrentRunningApp();
      
      setEnforcementState(prev => ({
        ...prev,
        currentApp
      }));
      
      // Trigger enforcement if needed
      await enforceRestriction();
    }, 2000);
    
    console.log('📱 App monitoring started');
  };

  const stopAppMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
      console.log('📱 App monitoring stopped');
    }
  };

  // Helper function to identify system apps that shouldn't be blocked
  const isSystemApp = (packageName: string): boolean => {
    const systemApps = [
      'com.android.systemui',
      'com.android.settings',
      'com.android.phone',
      'com.android.dialer',
      'com.android.contacts',
      'android',
      'com.google.android.gms',
      // Add your app's package name so it doesn't block itself
      'com.focuslock.app'
    ];
    
    return systemApps.some(systemApp => packageName.includes(systemApp));
  };

  useEffect(() => {
    // Check device admin status on mount
    checkDeviceAdminStatus();
    
    // Cleanup monitoring on unmount
    return () => {
      stopAppMonitoring();
    };
  }, []);

  return {
    enforcementState,
    checkDeviceAdminStatus,
    requestDeviceAdminPermission,
    startEnforcement,
    stopEnforcement,
    enforceRestriction,
    // 🚀 NEW: App management functions
    startAppMonitoring,
    stopAppMonitoring
  };
};