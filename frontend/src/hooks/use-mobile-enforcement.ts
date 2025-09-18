// Mobile Enforcement Hook for FocusLock
// UNCOMMENT AND USE WHEN CONVERTING TO CAPACITOR + ANDROID

import { useDeviceAdmin } from '../../../mobile/capacitor-device-admin';
import { useState, useEffect } from 'react';

export interface EnforcementState {
  isActive: boolean;
  isDeviceAdminEnabled: boolean;
  strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
  targetApps: string[];
}

export const useMobileEnforcement = () => {
  const [enforcementState, setEnforcementState] = useState<EnforcementState>({
    isActive: false,
    isDeviceAdminEnabled: false,
    strictLevel: 'MEDIUM',
    targetApps: []
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
      
      setEnforcementState({
        isActive: true,
        isDeviceAdminEnabled: true,
        strictLevel: taskData.strictLevel,
        targetApps: taskData.targetApps
      });
      
      // Disable camera for MEDIUM and HARD levels
      if (taskData.strictLevel !== 'SOFT') {
        await deviceAdmin.disableCamera(true);
      }
      
      return true;
    }

    // WEB VERSION: Just update state for demo
    setEnforcementState({
      isActive: true,
      isDeviceAdminEnabled: false,
      strictLevel: taskData.strictLevel,
      targetApps: taskData.targetApps
    });
    
    console.log('Enforcement started (web demo mode):', taskData);
    return true;
  };

  const stopEnforcement = async (): Promise<void> => {
    // MOBILE VERSION:
    if (deviceAdmin.isNativePlatform && enforcementState.isDeviceAdminEnabled) {
      // Re-enable camera
      await deviceAdmin.disableCamera(false);
    }

    setEnforcementState(prev => ({ 
      ...prev, 
      isActive: false,
      strictLevel: 'MEDIUM',
      targetApps: []
    }));
    
    console.log('Enforcement stopped');
  };

  const enforceRestriction = async (): Promise<void> => {
    if (!enforcementState.isActive) return;

    // MOBILE VERSION:
    if (deviceAdmin.isNativePlatform && enforcementState.isDeviceAdminEnabled) {
      switch (enforcementState.strictLevel) {
        case 'SOFT':
          // Just show notification (handled by app)
          break;
        case 'MEDIUM':
          // Lock device after 10 second grace period
          setTimeout(async () => {
            await deviceAdmin.lockDevice();
          }, 10000);
          break;
        case 'HARD':
          // Lock device immediately
          await deviceAdmin.lockDevice();
          break;
      }
    } else {
      // WEB VERSION: Show console message
      console.log(`Enforcement triggered: ${enforcementState.strictLevel} level`);
    }
  };

  useEffect(() => {
    // Check device admin status on mount
    checkDeviceAdminStatus();
  }, []);

  return {
    enforcementState,
    checkDeviceAdminStatus,
    requestDeviceAdminPermission,
    startEnforcement,
    stopEnforcement,
    enforceRestriction
  };
};