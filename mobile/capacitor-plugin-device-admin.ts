// Custom Capacitor Plugin for Device Admin
// COPY THIS TO: android/app/src/main/java/[your-package]/DeviceAdminPlugin.java
// AND REGISTER IN MainActivity.java

/* 
========== ANDROID JAVA CODE - COPY TO ANDROID PROJECT ==========

package com.focuslock.app; // CHANGE TO YOUR PACKAGE

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

import android.app.admin.DevicePolicyManager;
import android.content.Context;
import android.content.Intent;

@CapacitorPlugin(name = "DeviceAdmin")
public class DeviceAdminPlugin extends Plugin {

    @PluginMethod
    public void isDeviceAdminActive(PluginCall call) {
        boolean isActive = DeviceAdminReceiver.isDeviceAdminActive(getContext());
        JSObject ret = new JSObject();
        ret.put("active", isActive);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestDeviceAdmin(PluginCall call) {
        try {
            DeviceAdminReceiver.requestDeviceAdmin(getActivity());
            JSObject ret = new JSObject();
            ret.put("granted", true); // Will be confirmed later by user action
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("granted", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void lockDevice(PluginCall call) {
        try {
            DeviceAdminReceiver.lockDevice(getContext());
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void setCameraDisabled(PluginCall call) {
        boolean disabled = call.getBoolean("disabled", false);
        try {
            DeviceAdminReceiver.setCameraDisabled(getContext(), disabled);
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            JSObject ret = new JSObject();
            ret.put("success", false);
            call.resolve(ret);
        }
    }
}

========== REGISTER IN MainActivity.java ==========

import com.focuslock.app.DeviceAdminPlugin; // ADD THIS IMPORT

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Initializes the Bridge
        this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
            add(DeviceAdminPlugin.class); // ADD THIS LINE
        }});
    }
}

*/