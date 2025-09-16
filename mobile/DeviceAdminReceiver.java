// COPY THIS FILE TO: android/app/src/main/java/[your-package]/DeviceAdminReceiver.java
// REPLACE [your-package] with your actual package name (e.g., com.focuslock.app)

package com.focuslock.app; // CHANGE THIS TO YOUR ACTUAL PACKAGE

import android.app.admin.DeviceAdminReceiver;
import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.Intent;
import android.widget.Toast;

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
}