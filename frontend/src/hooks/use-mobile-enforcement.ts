// Mobile Enforcement Hook for FocusLock
// Updated to use FocusGuard (Consumer-Safe Enforcement)

import { useFocusGuard } from '../../../mobile/capacitor-focus-guard';
import { useState, useEffect } from 'react';

export interface EnforcementState {
  isActive: boolean;
  isDeviceAdminEnabled: boolean; // Renamed but kept for backward compatibility - now means "FocusGuard permissions enabled"
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

  // Enable FocusGuard consumer-safe enforcement
  const focusGuard = useFocusGuard();

  const checkDeviceAdminStatus = async (): Promise<boolean> => {
    // MOBILE VERSION:
    if (focusGuard.isNativePlatform) {
      const permissions = await focusGuard.checkPermissions();
      // Consider enforcement enabled if we have the core permissions
      const isEnabled = permissions.accessibility && permissions.overlay && permissions.usageAccess;
      setEnforcementState(prev => ({ ...prev, isDeviceAdminEnabled: isEnabled }));
      return isEnabled;
    }
    
    // WEB VERSION: Always return false
    return false;
  };

  const requestDeviceAdminPermission = async (): Promise<boolean> => {
    // MOBILE VERSION:
    if (focusGuard.isNativePlatform) {
      // Request all required permissions including battery optimization exemption
      console.log('🔒 Requesting FocusGuard permissions...');
      const granted = await focusGuard.requestAllPermissions();
      
      if (granted) {
        // Also request battery optimization exemption to ensure background services work
        console.log('🔋 Requesting battery optimization exemption...');
        await focusGuard.requestBatteryOptimizationExemption();
        
        setEnforcementState(prev => ({ ...prev, isDeviceAdminEnabled: true }));
        console.log('✅ All FocusGuard permissions granted');
      } else {
        console.log('❌ Some FocusGuard permissions were denied');
      }
      return granted;
    }
    
    // WEB VERSION: Show info toast
    console.log('🌐 FocusGuard only available on mobile app');
    return false;
  };

  const startEnforcement = async (taskData: {
    strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
    targetApps: string[];
    durationMinutes: number;
  }): Promise<boolean> => {
    // MOBILE VERSION:
    if (focusGuard.isNativePlatform) {
      const isPermissionsActive = await checkDeviceAdminStatus();
      if (!isPermissionsActive) {
        const granted = await requestDeviceAdminPermission();
        if (!granted) return false;
      }
      
      // 🚀 NEW: Start FocusGuard session (replaces individual app blocking)
      const sessionId = await focusGuard.startEnforcementSession({
        allowedApps: taskData.targetApps,
        strictLevel: taskData.strictLevel,
        durationMinutes: taskData.durationMinutes
      });
      
      if (!sessionId) {
        console.log('Failed to start enforcement session');
        return false;
      }
      
      // Get all installed apps to compute which ones will be blocked (for UI state only)
      const installedApps = await focusGuard.getInstalledApps();
      const appsToBlock = installedApps
        .filter(app => !taskData.targetApps.includes(app.packageName))
        .map(app => app.packageName);
      
      // Filter out system apps that shouldn't be blocked (for UI state)
      const blockedApps: string[] = [];
      for (const packageName of appsToBlock) {
        if (!isSystemApp(packageName)) {
          blockedApps.push(packageName);
        }
      }
      
      setEnforcementState({
        isActive: true,
        isDeviceAdminEnabled: true,
        strictLevel: taskData.strictLevel,
        targetApps: taskData.targetApps,
        blockedApps, // For UI only - actual blocking handled by FocusGuard
        currentApp: null
      });
      
      // 🚀 Start background monitoring service (critical for mobile)
      const backgroundStarted = await focusGuard.startBackgroundMonitoring();
      if (!backgroundStarted) {
        console.warn('⚠️ Background monitoring failed to start - enforcement may not persist when app is backgrounded');
      } else {
        console.log('🔄 Background monitoring service started successfully');
      }
      
      // 🔋 Request battery optimization exemption to ensure service survives
      console.log('🔋 Ensuring battery optimization exemption...');
      await focusGuard.requestBatteryOptimizationExemption();
      
      console.log(`✅ FocusGuard session started: ${blockedApps.length} apps will be blocked, ${taskData.targetApps.length} apps allowed`);
      console.log(`📱 Session ID: ${sessionId}`);
      console.log(`🔄 Background monitoring: ${backgroundStarted ? 'ACTIVE' : 'FAILED'}`);
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
    if (focusGuard.isNativePlatform && enforcementState.isDeviceAdminEnabled) {
      // 🚀 NEW: Stop FocusGuard session (automatically unblocks all apps)
      await focusGuard.stopEnforcementSession();
      
      // Stop background monitoring
      await focusGuard.stopBackgroundMonitoring();
      
      // Hide any active overlays
      await focusGuard.hideAppBlockOverlay();
    }

    setEnforcementState(prev => ({ 
      ...prev, 
      isActive: false,
      strictLevel: 'MEDIUM',
      targetApps: [],
      blockedApps: [],
      currentApp: null
    }));
    
    console.log('FocusGuard session stopped - all apps unblocked');
  };

  const enforceRestriction = async (): Promise<void> => {
    if (!enforcementState.isActive) return;

    // MOBILE VERSION:
    if (focusGuard.isNativePlatform && enforcementState.isDeviceAdminEnabled) {
      const currentApp = await focusGuard.getCurrentRunningApp();
      
      // Check if current app is blocked (Note: FocusGuard handles automatic enforcement,
      // this is mainly for UI state updates and additional logging)
      if (currentApp && enforcementState.blockedApps.includes(currentApp)) {
        console.log(`🚫 Blocked app detected: ${currentApp}`);
        
        // FocusGuard's AccessibilityService handles the actual enforcement automatically
        // We can still show overlays or perform additional actions here if needed
        switch (enforcementState.strictLevel) {
          case 'SOFT':
            console.log('⚠️ Soft restriction: Overlay shown, user can dismiss');
            await focusGuard.showAppBlockOverlay(currentApp, true);
            break;
          case 'MEDIUM':
            console.log('⏰ Medium restriction: Grace period then home action');
            await focusGuard.showAppBlockOverlay(currentApp, false);
            break;
          case 'HARD':
            console.log('🔒 Hard restriction: Immediate home action');
            await focusGuard.performHomeAction();
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
    if (!focusGuard.isNativePlatform) return;
    
    // Note: FocusGuard handles automatic monitoring via AccessibilityService
    // This manual monitoring is mainly for UI state updates
    monitoringInterval = setInterval(async () => {
      const currentApp = await focusGuard.getCurrentRunningApp();
      
      setEnforcementState(prev => ({
        ...prev,
        currentApp
      }));
      
      // Optional: Additional enforcement logic (FocusGuard handles core enforcement)
      await enforceRestriction();
    }, 2000);
    
    console.log('📱 Manual app monitoring started (FocusGuard handles automatic enforcement)');
  };

  const stopAppMonitoring = () => {
    if (monitoringInterval) {
      clearInterval(monitoringInterval);
      monitoringInterval = null;
      console.log('📱 Manual app monitoring stopped');
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