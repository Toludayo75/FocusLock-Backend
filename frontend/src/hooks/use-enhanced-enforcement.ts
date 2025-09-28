// Enhanced Mobile Enforcement with Graceful Degradation
// Provides different enforcement levels based on available permissions

import { useState, useEffect, useCallback } from 'react';
import { useFocusGuard } from '../../../mobile/capacitor-focus-guard';
import { usePermissionManager } from './use-permission-manager';
import { useToast } from './use-toast';

export interface EnforcementCapabilities {
  canBlockApps: boolean;          // Full app blocking capability
  canShowOverlays: boolean;       // Can show blocking overlays
  canTrackUsage: boolean;         // Can track app usage
  canRunBackground: boolean;      // Can run in background
  canSendNotifications: boolean;  // Can send notifications
  level: 'none' | 'basic' | 'partial' | 'full';
}

export interface EnhancedEnforcementState {
  isActive: boolean;
  capabilities: EnforcementCapabilities;
  strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
  targetApps: string[];
  blockedApps: string[];
  currentApp: string | null;
  degradationWarnings: string[];
}

export interface TaskEnforcementOptions {
  strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
  targetApps: string[];
  durationMinutes: number;
  fallbackToNotifications?: boolean;
  requireFullEnforcement?: boolean;
}

export const useEnhancedEnforcement = () => {
  const focusGuard = useFocusGuard();
  const permissionManager = usePermissionManager();
  const { toast } = useToast();
  
  const [state, setState] = useState<EnhancedEnforcementState>({
    isActive: false,
    capabilities: {
      canBlockApps: false,
      canShowOverlays: false,
      canTrackUsage: false,
      canRunBackground: false,
      canSendNotifications: false,
      level: 'none'
    },
    strictLevel: 'MEDIUM',
    targetApps: [],
    blockedApps: [],
    currentApp: null,
    degradationWarnings: []
  });

  // Calculate current enforcement capabilities based on permissions
  const calculateCapabilities = useCallback((): EnforcementCapabilities => {
    if (!permissionManager.isNativePlatform) {
      return {
        canBlockApps: false,
        canShowOverlays: false,
        canTrackUsage: false,
        canRunBackground: false,
        canSendNotifications: false,
        level: 'none'
      };
    }

    const permissions = permissionManager.permissions;
    
    const capabilities: EnforcementCapabilities = {
      canBlockApps: !!(permissions.accessibility?.isGranted && permissions.overlay?.isGranted),
      canShowOverlays: !!permissions.overlay?.isGranted,
      canTrackUsage: !!permissions.usageAccess?.isGranted,
      canRunBackground: !!permissions.batteryOptimization?.isGranted,
      canSendNotifications: !!permissions.notificationListener?.isGranted,
      level: 'none'
    };

    // Determine enforcement level
    if (capabilities.canBlockApps && capabilities.canTrackUsage && capabilities.canRunBackground) {
      capabilities.level = 'full';
    } else if (capabilities.canBlockApps || (capabilities.canShowOverlays && capabilities.canTrackUsage)) {
      capabilities.level = 'partial';
    } else if (capabilities.canShowOverlays || capabilities.canTrackUsage) {
      capabilities.level = 'basic';
    } else {
      capabilities.level = 'none';
    }

    return capabilities;
  }, [permissionManager.permissions, permissionManager.isNativePlatform]);

  // Generate degradation warnings based on missing permissions
  const generateDegradationWarnings = useCallback((
    requestedLevel: 'SOFT' | 'MEDIUM' | 'HARD',
    capabilities: EnforcementCapabilities
  ): string[] => {
    const warnings: string[] = [];

    if (!permissionManager.isNativePlatform) {
      warnings.push("Running in web mode - enforcement features not available");
      return warnings;
    }

    if (requestedLevel === 'HARD' && !capabilities.canBlockApps) {
      warnings.push("Hard enforcement requested but app blocking not available - falling back to overlays and notifications");
    }

    if ((requestedLevel === 'MEDIUM' || requestedLevel === 'HARD') && !capabilities.canShowOverlays) {
      warnings.push("Visual blocking not available - will rely on notifications only");
    }

    if (!capabilities.canTrackUsage) {
      warnings.push("App usage tracking not available - cannot detect when blocked apps are opened");
    }

    if (!capabilities.canRunBackground) {
      warnings.push("Background monitoring limited - enforcement may stop when app is minimized");
    }

    if (capabilities.level === 'none') {
      warnings.push("No enforcement capabilities available - will function as task timer only");
    }

    return warnings;
  }, [permissionManager.isNativePlatform]);

  // Update capabilities when permissions change
  useEffect(() => {
    const capabilities = calculateCapabilities();
    setState(prev => ({
      ...prev,
      capabilities,
      degradationWarnings: generateDegradationWarnings(prev.strictLevel, capabilities)
    }));
  }, [permissionManager.permissions, calculateCapabilities, generateDegradationWarnings]);

  // Start enforcement with graceful degradation
  const startEnforcement = useCallback(async (options: TaskEnforcementOptions): Promise<{
    success: boolean;
    actualLevel: 'SOFT' | 'MEDIUM' | 'HARD' | 'NOTIFICATIONS_ONLY' | 'TIMER_ONLY';
    warnings: string[];
  }> => {
    const capabilities = calculateCapabilities();
    const warnings = generateDegradationWarnings(options.strictLevel, capabilities);
    
    // Check if we can meet the minimum requirements
    if (options.requireFullEnforcement && capabilities.level !== 'full') {
      return {
        success: false,
        actualLevel: 'TIMER_ONLY',
        warnings: [...warnings, "Full enforcement required but not available with current permissions"]
      };
    }

    // Determine actual enforcement level based on capabilities
    let actualLevel: 'SOFT' | 'MEDIUM' | 'HARD' | 'NOTIFICATIONS_ONLY' | 'TIMER_ONLY' = 'TIMER_ONLY';
    
    if (capabilities.canBlockApps) {
      actualLevel = options.strictLevel; // Can honor requested level
    } else if (capabilities.canShowOverlays) {
      actualLevel = 'SOFT'; // Downgrade to overlay-only
    } else if (options.fallbackToNotifications && capabilities.canSendNotifications) {
      actualLevel = 'NOTIFICATIONS_ONLY';
    }

    try {
      // Start appropriate enforcement based on capabilities
      if (focusGuard.isNativePlatform && capabilities.level !== 'none') {
        
        // Try to start full enforcement session if possible
        if (capabilities.canBlockApps) {
          const sessionId = await focusGuard.startEnforcementSession({
            allowedApps: options.targetApps,
            strictLevel: options.strictLevel,
            durationMinutes: options.durationMinutes
          });

          if (sessionId) {
            // Start background monitoring if available
            if (capabilities.canRunBackground) {
              await focusGuard.startBackgroundMonitoring();
            }

            // Get blocked apps for UI state
            const installedApps = await focusGuard.getInstalledApps();
            const blockedApps = installedApps
              .filter(app => !options.targetApps.includes(app.packageName))
              .map(app => app.packageName)
              .filter(packageName => !isSystemApp(packageName));

            setState(prev => ({
              ...prev,
              isActive: true,
              strictLevel: options.strictLevel,
              targetApps: options.targetApps,
              blockedApps,
              degradationWarnings: warnings
            }));

          } else {
            // Session failed to start, fallback to notifications/timer
            actualLevel = capabilities.canSendNotifications ? 'NOTIFICATIONS_ONLY' : 'TIMER_ONLY';
            warnings.push("Failed to start enforcement session - falling back to basic mode");
          }
        } else {
          // Limited enforcement - just update state for partial functionality
          setState(prev => ({
            ...prev,
            isActive: true,
            strictLevel: 'SOFT', // Force to soft mode
            targetApps: options.targetApps,
            blockedApps: [],
            degradationWarnings: warnings
          }));
        }
      } else {
        // Web version or no capabilities - timer only
        setState(prev => ({
          ...prev,
          isActive: true,
          strictLevel: options.strictLevel,
          targetApps: options.targetApps,
          blockedApps: [],
          degradationWarnings: warnings
        }));
      }

      // Show degradation warning to user if applicable
      if (warnings.length > 0 && actualLevel !== options.strictLevel) {
        toast({
          title: "Enforcement Mode Adjusted",
          description: `Running in ${actualLevel.toLowerCase().replace('_', ' ')} mode. ${warnings[0]}`,
          variant: "default"
        });
      }

      return {
        success: true,
        actualLevel,
        warnings
      };

    } catch (error) {
      console.error('Failed to start enforcement:', error);
      return {
        success: false,
        actualLevel: 'TIMER_ONLY',
        warnings: [...warnings, "Failed to start enforcement due to system error"]
      };
    }
  }, [focusGuard, calculateCapabilities, generateDegradationWarnings, toast]);

  // Stop enforcement
  const stopEnforcement = useCallback(async (): Promise<void> => {
    try {
      if (focusGuard.isNativePlatform && state.capabilities.canBlockApps) {
        await focusGuard.stopEnforcementSession();
        await focusGuard.stopBackgroundMonitoring();
        await focusGuard.hideAppBlockOverlay();
      }

      setState(prev => ({
        ...prev,
        isActive: false,
        targetApps: [],
        blockedApps: [],
        currentApp: null,
        degradationWarnings: []
      }));
      
    } catch (error) {
      console.error('Failed to stop enforcement:', error);
    }
  }, [focusGuard, state.capabilities.canBlockApps]);

  // Check if app is currently blocked (for UI purposes)
  const isAppBlocked = useCallback((packageName: string): boolean => {
    return state.isActive && state.blockedApps.includes(packageName);
  }, [state.isActive, state.blockedApps]);

  // Get enforcement recommendations based on current capabilities
  const getEnforcementRecommendations = useCallback((): {
    recommendedLevel: 'SOFT' | 'MEDIUM' | 'HARD';
    availableFeatures: string[];
    missingFeatures: string[];
    setupSuggestions: string[];
  } => {
    const capabilities = calculateCapabilities();
    
    const availableFeatures: string[] = [];
    const missingFeatures: string[] = [];
    const setupSuggestions: string[] = [];

    if (capabilities.canBlockApps) {
      availableFeatures.push("Full app blocking");
    } else {
      missingFeatures.push("App blocking");
      if (!permissionManager.permissions.accessibility?.isGranted) {
        setupSuggestions.push("Enable Accessibility Service for app blocking");
      }
    }

    if (capabilities.canShowOverlays) {
      availableFeatures.push("Blocking overlays");
    } else {
      missingFeatures.push("Visual blocking overlays");
      setupSuggestions.push("Enable Display Over Other Apps permission");
    }

    if (capabilities.canTrackUsage) {
      availableFeatures.push("App usage monitoring");
    } else {
      missingFeatures.push("Usage tracking");
      setupSuggestions.push("Enable Usage Access permission");
    }

    if (capabilities.canRunBackground) {
      availableFeatures.push("Background enforcement");
    } else {
      missingFeatures.push("Background monitoring");
      setupSuggestions.push("Disable battery optimization for FocusLock");
    }

    // Recommend enforcement level based on capabilities
    let recommendedLevel: 'SOFT' | 'MEDIUM' | 'HARD' = 'SOFT';
    if (capabilities.level === 'full') {
      recommendedLevel = 'HARD';
    } else if (capabilities.level === 'partial') {
      recommendedLevel = 'MEDIUM';
    }

    return {
      recommendedLevel,
      availableFeatures,
      missingFeatures,
      setupSuggestions
    };
  }, [calculateCapabilities, permissionManager]);

  // Helper function to identify system apps
  const isSystemApp = (packageName: string): boolean => {
    const systemApps = [
      'com.android.systemui',
      'com.android.settings',
      'com.android.phone',
      'com.android.dialer',
      'com.android.contacts',
      'android',
      'com.google.android.gms',
      'com.focuslock.app'
    ];
    
    return systemApps.some(systemApp => packageName.includes(systemApp));
  };

  return {
    // State
    ...state,
    
    // Actions
    startEnforcement,
    stopEnforcement,
    
    // Utilities
    isAppBlocked,
    getEnforcementRecommendations,
    calculateCapabilities,
    
    // Permission management integration
    permissionManager,
    
    // Platform detection
    isNativePlatform: focusGuard.isNativePlatform
  };
};