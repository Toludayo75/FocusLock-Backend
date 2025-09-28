/*
================================================================================
🚫 DEVICE ADMIN APPROACH - COMMENTED OUT AND DEPRECATED
================================================================================

This file has been DISABLED because it uses DevicePolicyManager which requires:
- Device Owner privileges (factory reset required)
- Complex enterprise setup not suitable for consumer apps
- User must factory reset their device to grant permissions

✅ CURRENT IMPLEMENTATION: FocusGuardService.java
- Uses Accessibility Service (no factory reset needed)
- Uses Overlay permissions (standard Android permission)
- Uses Usage Access (standard permission in Settings)
- Consumer-friendly setup process

📝 DO NOT UNCOMMENT THIS FILE - IT IS KEPT FOR REFERENCE ONLY
================================================================================
*/

/*
// COPY THIS FILE TO: android/app/src/main/java/[your-package]/DeviceAdminReceiver.java
// REPLACE [your-package] with your actual package name (e.g., com.focuslock.app)

package com.focuslock.app; // CHANGE THIS TO YOUR ACTUAL PACKAGE

import android.app.admin.DeviceAdminReceiver;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;
// 🚀 NEW: Additional imports for app management
import android.app.ActivityManager;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import java.util.*;
import java.util.List;

public class DeviceAdminReceiver extends DeviceAdminReceiver {
    
    @Override
    public void onEnabled(Context context, Intent intent) {
        // Device admin was enabled
        Toast.makeText(context, "FocusLock Device Admin Enabled", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onDisabled(Context context, Intent intent) {
        // Device admin was disabled
        Toast.makeText(context, "FocusLock Device Admin Disabled", Toast.LENGTH_SHORT).show();
    }

    @Override
    public CharSequence onDisableRequested(Context context, Intent intent) {
        // User is trying to disable device admin
        return "Disabling FocusLock will prevent focus mode enforcement";
    }

    // Helper method to check if device admin is active
    public static boolean isDeviceAdminActive(Context context) {
        DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
        android.content.ComponentName adminComponent = new android.content.ComponentName(context, DeviceAdminReceiver.class);
        return dpm.isAdminActive(adminComponent);
    }

    // Helper method to request device admin
    public static void requestDeviceAdmin(Context context) {
        Intent intent = new Intent(DevicePolicyManager.ACTION_ADD_DEVICE_ADMIN);
        android.content.ComponentName adminComponent = new android.content.ComponentName(context, DeviceAdminReceiver.class);
        intent.putExtra(DevicePolicyManager.EXTRA_DEVICE_ADMIN, adminComponent);
        intent.putExtra(DevicePolicyManager.EXTRA_ADD_EXPLANATION, 
            "FocusLock needs Device Administrator permission to enforce focus sessions by locking your device when you try to access distracting apps.");
        context.startActivity(intent);
    }

    // Helper method to lock device
    public static void lockDevice(Context context) {
        if (isDeviceAdminActive(context)) {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            dpm.lockNow();
        }
    }

    // Helper method to disable camera
    public static void setCameraDisabled(Context context, boolean disabled) {
        if (isDeviceAdminActive(context)) {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            android.content.ComponentName adminComponent = new android.content.ComponentName(context, DeviceAdminReceiver.class);
            dpm.setCameraDisabled(adminComponent, disabled);
        }
    }

    // 🚀 NEW: App Management Methods
    
    // Get list of installed apps
    public static JSArray getInstalledApps(Context context) {
        JSArray apps = new JSArray();
        try {
            PackageManager pm = context.getPackageManager();
            List<ApplicationInfo> installedApps = pm.getInstalledApplications(PackageManager.GET_META_DATA);
            
            for (ApplicationInfo app : installedApps) {
                // Skip system apps that users typically don't interact with
                if ((app.flags & ApplicationInfo.FLAG_SYSTEM) == 0) {
                    JSObject appInfo = new JSObject();
                    appInfo.put("packageName", app.packageName);
                    appInfo.put("appName", pm.getApplicationLabel(app).toString());
                    apps.put(appInfo);
                }
            }
        } catch (Exception e) {
            Log.e("DeviceAdmin", "Error getting installed apps", e);
        }
        return apps;
    }
    
    // Block/unblock specific app
    public static boolean setAppBlocked(Context context, String packageName, boolean blocked) {
        if (!isDeviceAdminActive(context)) return false;
        
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            android.content.ComponentName adminComponent = new android.content.ComponentName(context, DeviceAdminReceiver.class);
            
            if (blocked) {
                // Hide the app from the launcher
                dpm.setApplicationHidden(adminComponent, packageName, true);
                return true;
            } else {
                // Show the app in the launcher
                dpm.setApplicationHidden(adminComponent, packageName, false);
                return true;
            }
        } catch (Exception e) {
            Log.e("DeviceAdmin", "Error blocking/unblocking app: " + packageName, e);
            return false;
        }
    }
    
    // Check if app is currently blocked
    public static boolean isAppBlocked(Context context, String packageName) {
        if (!isDeviceAdminActive(context)) return false;
        
        try {
            DevicePolicyManager dpm = (DevicePolicyManager) context.getSystemService(Context.DEVICE_POLICY_SERVICE);
            android.content.ComponentName adminComponent = new android.content.ComponentName(context, DeviceAdminReceiver.class);
            return dpm.isApplicationHidden(adminComponent, packageName);
        } catch (Exception e) {
            Log.e("DeviceAdmin", "Error checking app block status: " + packageName, e);
            return false;
        }
    }
    
    // Get currently running foreground app
    public static String getCurrentRunningApp(Context context) {
        try {
            ActivityManager am = (ActivityManager) context.getSystemService(Context.ACTIVITY_SERVICE);
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                // For Android 5.0+, need usage stats permission
                UsageStatsManager usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
                long time = System.currentTimeMillis();
                List<UsageStats> stats = usageStatsManager.queryUsageStats(
                    UsageStatsManager.INTERVAL_DAILY, 
                    time - 1000 * 60, // Last minute
                    time
                );
                
                if (stats != null && stats.size() > 0) {
                    // Sort by last time used
                    stats.sort((a, b) -> Long.compare(b.getLastTimeUsed(), a.getLastTimeUsed()));
                    return stats.get(0).getPackageName();
                }
            } else {
                // For older Android versions
                List<ActivityManager.RunningTaskInfo> taskInfo = am.getRunningTasks(1);
                if (taskInfo != null && taskInfo.size() > 0) {
                    return taskInfo.get(0).topActivity.getPackageName();
                }
            }
        } catch (Exception e) {
            Log.e("DeviceAdmin", "Error getting current running app", e);
        }
        return null;
    }
    
    // Set app usage restrictions based on allowed apps and strict level
    public static boolean setAppUsageRestrictions(Context context, JSArray allowedApps, String strictLevel) {
        if (!isDeviceAdminActive(context)) return false;
        
        try {
            // Store restrictions in shared preferences for later enforcement
            SharedPreferences prefs = context.getSharedPreferences("FocusLockRestrictions", Context.MODE_PRIVATE);
            SharedPreferences.Editor editor = prefs.edit();
            
            // Convert JSArray to Set<String>
            Set<String> allowedSet = new HashSet<>();
            for (int i = 0; i < allowedApps.length(); i++) {
                allowedSet.add(allowedApps.getString(i));
            }
            
            editor.putStringSet("allowedApps", allowedSet);
            editor.putString("strictLevel", strictLevel);
            editor.putBoolean("restrictionsActive", true);
            editor.apply();
            
            Log.i("DeviceAdmin", "App restrictions set: " + allowedSet.size() + " allowed apps, " + strictLevel + " level");
            return true;
        } catch (Exception e) {
            Log.e("DeviceAdmin", "Error setting app usage restrictions", e);
            return false;
        }
    }
}
*/