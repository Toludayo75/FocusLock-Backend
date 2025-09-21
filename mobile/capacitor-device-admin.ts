// ⚠️ DEPRECATED - DO NOT USE ⚠️
// This file uses DevicePolicyManager which requires Device Owner privileges (factory reset)
// Use capacitor-focus-guard.ts instead for consumer-safe enforcement

// Capacitor Device Admin Integration
// UNCOMMENT AND USE WHEN CONVERTING TO ANDROID

import { Capacitor } from '@capacitor/core';

// Device Admin Plugin Interface
export interface DeviceAdminPlugin {
  isDeviceAdminActive(): Promise<{ active: boolean }>;
  requestDeviceAdmin(): Promise<{ granted: boolean }>;
  lockDevice(): Promise<{ success: boolean }>;
  setCameraDisabled(options: { disabled: boolean }): Promise<{ success: boolean }>;
  
  // 🚀 NEW: App Management Functions
  getInstalledApps(): Promise<{ apps: Array<{ packageName: string; appName: string; }> }>;
  setAppBlocked(options: { packageName: string; blocked: boolean }): Promise<{ success: boolean }>;
  isAppBlocked(options: { packageName: string }): Promise<{ blocked: boolean }>;
  getCurrentRunningApp(): Promise<{ packageName: string | null }>;
  setAppUsageRestrictions(options: { 
    allowedApps: string[]; 
    strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
  }): Promise<{ success: boolean }>;
}

// Custom Capacitor Plugin for Device Admin
// This will be registered with Capacitor during Android build
const DeviceAdmin = Capacitor.registerPlugin<DeviceAdminPlugin>('DeviceAdmin');

// React Hook for Device Admin
export const useDeviceAdmin = () => {
  const isNativePlatform = Capacitor.isNativePlatform();
  
  const checkDeviceAdminStatus = async (): Promise<boolean> => {
    if (!isNativePlatform) return false;
    
    try {
      const result = await DeviceAdmin.isDeviceAdminActive();
      return result.active;
    } catch (error) {
      console.log('Device admin check failed:', error);
      return false;
    }
  };

  const requestDeviceAdminPermission = async (): Promise<boolean> => {
    if (!isNativePlatform) {
      console.log('Device admin only available on native platforms');
      return false;
    }

    try {
      const result = await DeviceAdmin.requestDeviceAdmin();
      return result.granted;
    } catch (error) {
      console.log('Device admin request failed:', error);
      return false;
    }
  };

  const lockDevice = async (): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const isActive = await checkDeviceAdminStatus();
      if (!isActive) {
        console.log('Device admin not active - cannot lock device');
        return false;
      }

      const result = await DeviceAdmin.lockDevice();
      return result.success;
    } catch (error) {
      console.log('Device lock failed:', error);
      return false;
    }
  };

  const disableCamera = async (disabled: boolean): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const isActive = await checkDeviceAdminStatus();
      if (!isActive) {
        console.log('Device admin not active - cannot control camera');
        return false;
      }

      const result = await DeviceAdmin.setCameraDisabled({ disabled });
      return result.success;
    } catch (error) {
      console.log('Camera control failed:', error);
      return false;
    }
  };

  // 🚀 NEW: App Management Functions
  const getInstalledApps = async (): Promise<Array<{ packageName: string; appName: string; }>> => {
    if (!isNativePlatform) return [];

    try {
      const result = await DeviceAdmin.getInstalledApps();
      return result.apps;
    } catch (error) {
      console.log('Get installed apps failed:', error);
      return [];
    }
  };

  const setAppBlocked = async (packageName: string, blocked: boolean): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const isActive = await checkDeviceAdminStatus();
      if (!isActive) {
        console.log('Device admin not active - cannot block apps');
        return false;
      }

      const result = await DeviceAdmin.setAppBlocked({ packageName, blocked });
      return result.success;
    } catch (error) {
      console.log('App blocking failed:', error);
      return false;
    }
  };

  const isAppBlocked = async (packageName: string): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const result = await DeviceAdmin.isAppBlocked({ packageName });
      return result.blocked;
    } catch (error) {
      console.log('Check app block status failed:', error);
      return false;
    }
  };

  const getCurrentRunningApp = async (): Promise<string | null> => {
    if (!isNativePlatform) return null;

    try {
      const result = await DeviceAdmin.getCurrentRunningApp();
      return result.packageName;
    } catch (error) {
      console.log('Get current app failed:', error);
      return null;
    }
  };

  const setAppUsageRestrictions = async (
    allowedApps: string[], 
    strictLevel: 'SOFT' | 'MEDIUM' | 'HARD'
  ): Promise<boolean> => {
    if (!isNativePlatform) return false;

    try {
      const isActive = await checkDeviceAdminStatus();
      if (!isActive) {
        console.log('Device admin not active - cannot set restrictions');
        return false;
      }

      const result = await DeviceAdmin.setAppUsageRestrictions({ 
        allowedApps, 
        strictLevel 
      });
      return result.success;
    } catch (error) {
      console.log('Set app restrictions failed:', error);
      return false;
    }
  };

  return {
    isNativePlatform,
    checkDeviceAdminStatus,
    requestDeviceAdminPermission,
    lockDevice,
    disableCamera,
    // 🚀 NEW: App Management
    getInstalledApps,
    setAppBlocked,
    isAppBlocked,
    getCurrentRunningApp,
    setAppUsageRestrictions
  };
};