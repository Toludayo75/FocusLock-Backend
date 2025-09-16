# Mobile Enforcement Integration for Capacitor

## How to Use These Files During Capacitor Conversion

### 1. Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npx cap init
```

### 2. Add Android Platform
```bash
npx cap add android
```

### 3. Copy Mobile Files to Android Project
After `npx cap add android`, copy these files:

- `DeviceAdminReceiver.java` → `android/app/src/main/java/[your-package]/`
- `device_admin_receiver.xml` → `android/app/src/main/res/xml/`
- Merge `android-manifest-additions.xml` into `android/app/src/main/AndroidManifest.xml`

### 4. Enable Mobile Enforcement in React
In your React components, uncomment the Capacitor enforcement code sections.

### 5. Build and Test
```bash
npx cap open android
```

Then build and test in Android Studio.