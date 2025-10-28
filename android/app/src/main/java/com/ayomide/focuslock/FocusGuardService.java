// COPY THIS FILE TO: android/app/src/main/java/[your-package]/FocusGuardService.java
// REPLACE [your-package] with your actual package name (e.g., com.focuslock.app)

package com.ayomide.focuslock; // CHANGE THIS TO YOUR ACTUAL PACKAGE

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.AccessibilityServiceInfo;
import android.app.ActivityManager;
import android.app.AppOpsManager;
import android.app.Notification;           // ✅ Needed
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;  // ✅ Needed
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.graphics.PixelFormat;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;           // ✅ Needed
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.LayoutInflater;
import android.view.View;
import android.view.WindowManager;
import android.view.accessibility.AccessibilityEvent;
import android.widget.Button;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.util.*;
import java.util.List;


// Main FocusGuard Service - Consumer-Safe Mobile Enforcement
public class FocusGuardService {
    private static final String TAG = "FocusGuard";
    public static final String PREFS_NAME = "FocusGuardSession";
    public static final String CHANNEL_ID = "FocusGuardChannel";

    // Session Management
    public static class SessionData {
        public Set<String> allowedApps;
        public String strictLevel; // SOFT, MEDIUM, HARD
        public int durationMinutes;
        public String sessionId;
        public long startTime;
        public boolean isActive;

        public SessionData() {
            this.allowedApps = new HashSet<>();
            this.strictLevel = "MEDIUM";
            this.durationMinutes = 30;
            this.sessionId = "";
            this.startTime = 0;
            this.isActive = false;
        }
    }

    // Permission Check Methods
    public static boolean isAccessibilityEnabled(Context context) {
        String service = context.getPackageName() + "/" + FocusAccessibilityService.class.getCanonicalName();
        String enabledServices = Settings.Secure.getString(
                context.getContentResolver(),
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        );
        return enabledServices != null && enabledServices.contains(service);
    }

    public static boolean isOverlayPermissionGranted(Context context) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(context);
    }

    public static boolean isUsageAccessGranted(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return true;

        AppOpsManager appOps = (AppOpsManager) context.getSystemService(Context.APP_OPS_SERVICE);
        int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,
                android.os.Process.myUid(), context.getPackageName());
        return mode == AppOpsManager.MODE_ALLOWED;
    }

    public static boolean isBatteryOptimizationDisabled(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        return pm.isIgnoringBatteryOptimizations(context.getPackageName());
    }

    // Permission Request Methods
    public static void requestOverlayPermission(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(context)) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
    }

    public static void requestUsageAccessPermission(Context context) {
        Intent intent = new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    public static void requestAccessibilityPermission(Context context) {
        Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        context.startActivity(intent);
    }

    public static void requestBatteryOptimizationExemption(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + context.getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(intent);
        }
    }

    // Session Management
    public static boolean startSession(Context context, JSArray allowedApps, String strictLevel, int durationMinutes) {
        try {
            // Check required permissions
            if (!isAccessibilityEnabled(context) || !isOverlayPermissionGranted(context) || !isUsageAccessGranted(context)) {
                Log.w(TAG, "Missing required permissions for session start");
                return false;
            }

            // Convert JSArray to Set
            Set<String> allowedSet = new HashSet<>();
            for (int i = 0; i < allowedApps.length(); i++) {
                allowedSet.add(allowedApps.getString(i));
            }

            // Always allow system critical apps and FocusLock itself
            allowedSet.add("com.android.systemui");
            allowedSet.add("com.android.settings");
            allowedSet.add("com.android.phone");
            allowedSet.add("com.android.dialer");
            allowedSet.add("android");
            allowedSet.add(context.getPackageName()); // Don't block ourselves

            // Store session data
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            editor.putStringSet("allowedApps", allowedSet);
            editor.putString("strictLevel", strictLevel);
            editor.putInt("durationMinutes", durationMinutes);
            editor.putString("sessionId", "session_" + System.currentTimeMillis());
            editor.putLong("startTime", System.currentTimeMillis());
            editor.putBoolean("isActive", true);
            editor.putInt("blockedAppAttempts", 0);
            editor.apply();

            // Start background monitoring service
            Intent serviceIntent = new Intent(context, FocusMonitorService.class);
            context.startForegroundService(serviceIntent);

            Log.i(TAG, "Focus session started: " + allowedSet.size() + " allowed apps, " + strictLevel + " level, " + durationMinutes + " minutes");
            return true;

        } catch (Exception e) {
            Log.e(TAG, "Error starting session", e);
            return false;
        }
    }

    public static boolean stopSession(Context context) {
        try {
            // Clear session data
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            prefs.edit().clear().apply();

            // Stop monitoring service
            Intent serviceIntent = new Intent(context, FocusMonitorService.class);
            context.stopService(serviceIntent);

            // Hide any active overlays
            FocusOverlayManager.hideOverlay(context);

            Log.i(TAG, "Focus session stopped");
            return true;

        } catch (Exception e) {
            Log.e(TAG, "Error stopping session", e);
            return false;
        }
    }

    public static SessionData getSessionStatus(Context context) {
        SessionData sessionData = new SessionData();
        try {
            SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

            sessionData.allowedApps = prefs.getStringSet("allowedApps", new HashSet<>());
            sessionData.strictLevel = prefs.getString("strictLevel", "MEDIUM");
            sessionData.durationMinutes = prefs.getInt("durationMinutes", 30);
            sessionData.sessionId = prefs.getString("sessionId", "");
            sessionData.startTime = prefs.getLong("startTime", 0);
            sessionData.isActive = prefs.getBoolean("isActive", false);

            return sessionData;

        } catch (Exception e) {
            Log.e(TAG, "Error getting session status", e);
            return sessionData;
        }
    }

    // App Information
    public static JSArray getInstalledApps(Context context) {
        JSArray apps = new JSArray();
        try {
            PackageManager pm = context.getPackageManager();
            List<ApplicationInfo> installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA);

            for (ApplicationInfo app : installedApps) {
                // Include both system and user apps for better app selection
                if ((app.flags & ApplicationInfo.FLAG_SYSTEM) == 0 || isCommonApp(app.packageName)) {
                    JSObject appInfo = new JSObject();
                    appInfo.put("packageName", app.packageName);
                    appInfo.put("appName", pm.getApplicationLabel(app).toString());
                    apps.put(appInfo);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting installed apps", e);
        }
        return apps;
    }

    private static boolean isCommonApp(String packageName) {
        // Include common system apps that users might want to allow
        String[] commonApps = {
                "com.android.chrome", "com.google.android.gm", "com.whatsapp",
                "com.instagram.android", "com.facebook.katana", "com.twitter.android",
                "com.spotify.music", "com.netflix.mediaclient", "com.youtube.android"
        };

        for (String common : commonApps) {
            if (packageName.contains(common)) return true;
        }
        return false;
    }

    public static String getCurrentRunningApp(Context context) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                // Use UsageStatsManager for Android 5.0+
                UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
                long time = System.currentTimeMillis();
                List<UsageStats> stats = usageStatsManager.queryUsageStats(
                        UsageStatsManager.INTERVAL_DAILY,
                        time - 1000 * 60, // Last minute
                        time
                );

                if (stats != null && stats.size() > 0) {
                    stats.sort((a, b) -> Long.compare(b.getLastTimeUsed(), a.getLastTimeUsed()));
                    return stats.get(0).getPackageName();
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting current running app", e);
        }
        return null;
    }

    // Usage Statistics
    public static JSArray getUsageStats(Context context, int hours) {
        JSArray apps = new JSArray();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
                long endTime = System.currentTimeMillis();
                long startTime = endTime - (hours * 60 * 60 * 1000L);

                List<UsageStats> stats = usageStatsManager.queryUsageStats(
                        UsageStatsManager.INTERVAL_DAILY, startTime, endTime);

                if (stats != null) {
                    for (UsageStats usageStats : stats) {
                        if (usageStats.getTotalTimeInForeground() > 0) {
                            JSObject appInfo = new JSObject();
                            appInfo.put("packageName", usageStats.getPackageName());
                            appInfo.put("timeSpent", usageStats.getTotalTimeInForeground());
                            apps.put(appInfo);
                        }
                    }
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error getting usage stats", e);
        }
        return apps;
    }
}

// Accessibility Service for App Detection and Home Actions
class FocusAccessibilityService extends AccessibilityService {
    private static final String TAG = "FocusAccessibility";
    private Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onServiceConnected() {
        super.onServiceConnected();

        AccessibilityServiceInfo info = new AccessibilityServiceInfo();
        info.eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED;
        info.feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC;
        info.flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS;

        setServiceInfo(info);
        Log.i(TAG, "FocusGuard Accessibility Service connected");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            String packageName = event.getPackageName() != null ? event.getPackageName().toString() : null;

            if (packageName != null) {
                // Check if this app should be blocked
                checkAndEnforceAppRestriction(packageName);
            }
        }
    }

    private void checkAndEnforceAppRestriction(String packageName) {
        try {
            SharedPreferences prefs = getSharedPreferences(FocusGuardService.PREFS_NAME, Context.MODE_PRIVATE);
            boolean isActive = prefs.getBoolean("isActive", false);

            if (!isActive) return;

            Set<String> allowedApps = prefs.getStringSet("allowedApps", new HashSet<>());
            String strictLevel = prefs.getString("strictLevel", "MEDIUM");

            if (!allowedApps.contains(packageName)) {
                Log.i(TAG, "Blocked app detected: " + packageName + " (Level: " + strictLevel + ")");

                // Increment attempt counter
                int attempts = prefs.getInt("blockedAppAttempts", 0) + 1;
                prefs.edit().putInt("blockedAppAttempts", attempts).apply();

                // Show overlay first
                FocusOverlayManager.showOverlay(this, packageName, strictLevel, attempts);

                // Apply enforcement based on strict level
                switch (strictLevel) {
                    case "SOFT":
                        // Overlay only, user can dismiss
                        break;
                    case "MEDIUM":
                        // Grace period then home
                        handler.postDelayed(() -> performGlobalAction(GLOBAL_ACTION_HOME), 5000);
                        break;
                    case "HARD":
                        // Immediate home action
                        performGlobalAction(GLOBAL_ACTION_HOME);
                        break;
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Error checking app restriction for: " + packageName, e);
        }
    }

    @Override
    public void onInterrupt() {
        Log.i(TAG, "FocusGuard Accessibility Service interrupted");
    }
}

// Overlay Manager for Blocking Apps
class FocusOverlayManager {
    private static final String TAG = "FocusOverlay";
    private static View overlayView = null;
    private static WindowManager windowManager = null;

    public static void showOverlay(Context context, String blockedPackage, String strictLevel, int attempts) {
        try {
            if (!FocusGuardService.isOverlayPermissionGranted(context)) {
                Log.w(TAG, "Overlay permission not granted");
                return;
            }

            // Remove existing overlay
            hideOverlay(context);

            windowManager = (WindowManager) context.getSystemService(Context.WINDOW_SERVICE);

            // Create overlay layout
            LayoutInflater inflater = LayoutInflater.from(context);
            overlayView = inflater.inflate(android.R.layout.simple_list_item_2, null);

            // Configure overlay appearance
            TextView title = overlayView.findViewById(android.R.id.text1);
            TextView subtitle = overlayView.findViewById(android.R.id.text2);

            title.setText("Focus Mode Active");
            subtitle.setText("This app is blocked during your focus session\nAttempts: " + attempts);

            // Window parameters
            WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                    WindowManager.LayoutParams.MATCH_PARENT,
                    WindowManager.LayoutParams.MATCH_PARENT,
                    Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                            ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                            : WindowManager.LayoutParams.TYPE_PHONE,
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE |
                            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL |
                            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                    PixelFormat.TRANSLUCENT
            );

            params.gravity = Gravity.CENTER;

            // Add overlay
            windowManager.addView(overlayView, params);

            Log.i(TAG, "Overlay shown for blocked app: " + blockedPackage);

            // Auto-hide for SOFT level after delay
            if ("SOFT".equals(strictLevel)) {
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    hideOverlay(context);
                }, 3000);
            }

        } catch (Exception e) {
            Log.e(TAG, "Error showing overlay", e);
        }
    }

    public static void hideOverlay(Context context) {
        try {
            if (overlayView != null && windowManager != null) {
                windowManager.removeView(overlayView);
                overlayView = null;
                windowManager = null;
                Log.i(TAG, "Overlay hidden");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error hiding overlay", e);
        }
    }
}

// Background Monitoring Service
class FocusMonitorService extends Service {
    private static final String TAG = "FocusMonitor";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIFICATION_ID, createNotification());

        // Register boot receiver to restore session after restart
        IntentFilter filter = new IntentFilter(Intent.ACTION_BOOT_COMPLETED);
        registerReceiver(new BootReceiver(), filter);

        return START_STICKY; // Restart if killed
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    FocusGuardService.CHANNEL_ID,
                    "Focus Mode Active",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Focus session monitoring");

            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }

    private Notification createNotification() {
        return new NotificationCompat.Builder(this, FocusGuardService.CHANNEL_ID)
                .setContentTitle("Focus Mode Active")
                .setContentText("Blocking distracting apps")
                .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setOngoing(true)
                .build();
    }
}

// Boot Receiver to Restore Sessions
class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            // Check if there was an active session
            SharedPreferences prefs = context.getSharedPreferences(FocusGuardService.PREFS_NAME, Context.MODE_PRIVATE);
            boolean wasActive = prefs.getBoolean("isActive", false);

            if (wasActive) {
                // Restart monitoring service
                Intent serviceIntent = new Intent(context, FocusMonitorService.class);
                context.startForegroundService(serviceIntent);

                Log.i("BootReceiver", "Restored active focus session after boot");
            }
        }
    }
}