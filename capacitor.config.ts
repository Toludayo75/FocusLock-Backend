import { CapacitorConfig } from '@capacitor/cli';
import { focusGuardPluginConfig } from './mobile/capacitor-plugin-focus-guard'; // 👈 add this line

const config: CapacitorConfig = {
  appId: 'com.ayomide.focuslock', // your Android package name
  appName: 'focuslock', // your app name
  webDir: 'frontend/dist', // path to built web assets
  server: {
    androidScheme: 'https',
    url: '', // replace with your backend URL
    cleartext: false
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    ...focusGuardPluginConfig.plugins // 👈 merge in FocusGuard plugin
  }
};

export default config;
