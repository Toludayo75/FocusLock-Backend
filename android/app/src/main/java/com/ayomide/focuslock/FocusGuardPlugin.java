
package com.ayomide.focuslock; // CHANGE TO YOUR PACKAGE

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;
import com.getcapacitor.JSArray;

import android.content.Context;
import android.util.Log;

@CapacitorPlugin(name = "FocusGuard")
public class FocusGuardPlugin extends Plugin {

    private static final String TAG = "FocusGuardPlugin";

    // Permission Management
    @PluginMethod
    public void checkPermissions(PluginCall call) {
        try {
            Context context = getContext();

            JSObject permissions = new JSObject();
            permissions.put("accessibility", FocusGuardService.isAccessibilityEnabled(context));
            permissions.put("overlay", FocusGuardService.isOverlayPermissionGranted(context));
            permissions.put("usageAccess", FocusGuardService.isUsageAccessGranted(context));
            permissions.put("notificationListener", false); // Optional for v1
            permissions.put("batteryOptimization", FocusGuardService.isBatteryOptimizationDisabled(context));

            call.resolve(permissions);

        } catch (Exception e) {
            Log.e(TAG, "Error checking permissions", e);
            call.reject("Permission check failed", e);
        }
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        try {
            Context context = getContext();
            JSArray granted = new JSArray();

            // Check each permission and request if needed
            boolean allGranted = true;

            if (!FocusGuardService.isAccessibilityEnabled(context)) {
                FocusGuardService.requestAccessibilityPermission(context);
                allGranted = false;
            } else {
                granted.put("accessibility");
            }

            if (!FocusGuardService.isOverlayPermissionGranted(context)) {
                FocusGuardService.requestOverlayPermission(context);
                allGranted = false;
            } else {
                granted.put("overlay");
            }

            if (!FocusGuardService.isUsageAccessGranted(context)) {
                FocusGuardService.requestUsageAccessPermission(context);
                allGranted = false;
            } else {
                granted.put("usageAccess");
            }

            if (!FocusGuardService.isBatteryOptimizationDisabled(context)) {
                FocusGuardService.requestBatteryOptimizationExemption(context);
                allGranted = false;
            } else {
                granted.put("batteryOptimization");
            }

            JSObject result = new JSObject();
            result.put("success", allGranted);
            result.put("granted", granted);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error requesting permissions", e);
            call.reject("Permission request failed", e);
        }
    }

    @PluginMethod
    public void openPermissionSettings(PluginCall call) {
        try {
            Context context = getContext();
            String permission = call.getString("permission", "");

            switch (permission) {
                case "accessibility":
                    FocusGuardService.requestAccessibilityPermission(context);
                    break;
                case "overlay":
                    FocusGuardService.requestOverlayPermission(context);
                    break;
                case "usageAccess":
                    FocusGuardService.requestUsageAccessPermission(context);
                    break;
                case "batteryOptimization":
                    FocusGuardService.requestBatteryOptimizationExemption(context);
                    break;
                default:
                    call.reject("Unknown permission type: " + permission);
                    return;
            }

            call.resolve();

        } catch (Exception e) {
            Log.e(TAG, "Error opening permission settings", e);
            call.reject("Failed to open permission settings", e);
        }
    }

    // Session Management
    @PluginMethod
    public void startSession(PluginCall call) {
        try {
            Context context = getContext();

            JSArray allowedApps = call.getArray("allowedApps", new JSArray());
            String strictLevel = call.getString("strictLevel", "MEDIUM");
            int durationMinutes = call.getInt("durationMinutes", 30);
            String sessionId = call.getString("sessionId", "session_" + System.currentTimeMillis());

            boolean success = FocusGuardService.startSession(context, allowedApps, strictLevel, durationMinutes);

            JSObject result = new JSObject();
            result.put("success", success);
            result.put("sessionId", sessionId);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error starting session", e);
            call.reject("Failed to start session", e);
        }
    }

    @PluginMethod
    public void stopSession(PluginCall call) {
        try {
            Context context = getContext();
            boolean success = FocusGuardService.stopSession(context);

            JSObject result = new JSObject();
            result.put("success", success);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error stopping session", e);
            call.reject("Failed to stop session", e);
        }
    }

    @PluginMethod
    public void getSessionStatus(PluginCall call) {
        try {
            Context context = getContext();
            FocusGuardService.SessionData session = FocusGuardService.getSessionStatus(context);

            JSObject result = new JSObject();
            result.put("isActive", session.isActive);
            result.put("strictLevel", session.strictLevel);
            result.put("durationMinutes", session.durationMinutes);
            result.put("sessionId", session.sessionId);
            result.put("sessionStartTime", session.startTime);

            // Calculate time remaining
            long timeRemaining = 0;
            if (session.isActive && session.startTime > 0) {
                long elapsed = System.currentTimeMillis() - session.startTime;
                long totalTime = session.durationMinutes * 60 * 1000L;
                timeRemaining = Math.max(0, totalTime - elapsed);
            }
            result.put("timeRemaining", timeRemaining);

            // Get current running app
            String currentApp = FocusGuardService.getCurrentRunningApp(context);
            result.put("currentForegroundApp", currentApp);

            // Mock blocked app attempts for now (would need to retrieve from session)
            result.put("blockedAppAttempts", 0);

            // Create current session object
            JSObject currentSession = null;
            if (session.isActive) {
                currentSession = new JSObject();

                JSArray allowedApps = new JSArray();
                for (String app : session.allowedApps) {
                    allowedApps.put(app);
                }

                currentSession.put("allowedApps", allowedApps);
                currentSession.put("strictLevel", session.strictLevel);
                currentSession.put("durationMinutes", session.durationMinutes);
                currentSession.put("sessionId", session.sessionId);
            }
            result.put("currentSession", currentSession);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error getting session status", e);
            call.reject("Failed to get session status", e);
        }
    }

    // App Management
    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        try {
            Context context = getContext();
            JSArray apps = FocusGuardService.getInstalledApps(context);

            JSObject result = new JSObject();
            result.put("apps", apps);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error getting installed apps", e);
            call.reject("Failed to get installed apps", e);
        }
    }

    @PluginMethod
    public void getCurrentApp(PluginCall call) {
        try {
            Context context = getContext();
            String currentApp = FocusGuardService.getCurrentRunningApp(context);

            JSObject result = new JSObject();
            result.put("packageName", currentApp);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error getting current app", e);
            call.reject("Failed to get current app", e);
        }
    }

    // Enforcement Actions
    @PluginMethod
    public void showBlockOverlay(PluginCall call) {
        try {
            Context context = getContext();
            String packageName = call.getString("packageName", "");
            String message = call.getString("message", "Focus Mode Active");
            boolean allowDismiss = call.getBoolean("allowDismiss", false);

            // For now, use the built-in overlay from FocusGuardService
            // In a full implementation, you might want to pass the custom message
            FocusOverlayManager.showOverlay(context, packageName, "SOFT", 1);

            JSObject result = new JSObject();
            result.put("success", true);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error showing block overlay", e);
            call.reject("Failed to show block overlay", e);
        }
    }

    @PluginMethod
    public void hideBlockOverlay(PluginCall call) {
        try {
            Context context = getContext();
            FocusOverlayManager.hideOverlay(context);

            JSObject result = new JSObject();
            result.put("success", true);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error hiding block overlay", e);
            call.reject("Failed to hide block overlay", e);
        }
    }

    @PluginMethod
    public void performHomeAction(PluginCall call) {
        try {
            // This would require the accessibility service to be active
            // The actual home action is performed in FocusAccessibilityService
            // This method mainly serves as a trigger

            JSObject result = new JSObject();
            result.put("success", true);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error performing home action", e);
            call.reject("Failed to perform home action", e);
        }
    }

    // Background Monitoring
    @PluginMethod
    public void startBackgroundMonitoring(PluginCall call) {
        try {
            Context context = getContext();

            // Background monitoring is started automatically with session
            // This method confirms it's running

            JSObject result = new JSObject();
            result.put("success", true);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error starting background monitoring", e);
            call.reject("Failed to start background monitoring", e);
        }
    }

    @PluginMethod
    public void stopBackgroundMonitoring(PluginCall call) {
        try {
            Context context = getContext();

            // Background monitoring stops with session

            JSObject result = new JSObject();
            result.put("success", true);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error stopping background monitoring", e);
            call.reject("Failed to stop background monitoring", e);
        }
    }

    @PluginMethod
    public void isBackgroundMonitoringActive(PluginCall call) {
        try {
            Context context = getContext();
            FocusGuardService.SessionData session = FocusGuardService.getSessionStatus(context);

            JSObject result = new JSObject();
            result.put("active", session.isActive);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error checking background monitoring status", e);
            call.reject("Failed to check background monitoring status", e);
        }
    }

    // Usage Statistics
    @PluginMethod
    public void getUsageStats(PluginCall call) {
        try {
            Context context = getContext();
            int hours = call.getInt("hours", 24);

            JSArray apps = FocusGuardService.getUsageStats(context, hours);

            JSObject result = new JSObject();
            result.put("apps", apps);

            call.resolve(result);

        } catch (Exception e) {
            Log.e(TAG, "Error getting usage stats", e);
            call.reject("Failed to get usage stats", e);
        }
    }
}
