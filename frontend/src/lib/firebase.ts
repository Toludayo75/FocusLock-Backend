import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { apiRequest } from './queryClient';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();
const isWeb = !isNative;

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// VAPID key for web push
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || '';

let app: any = null;
let messaging: Messaging | null = null;

export interface NotificationPermissionStatus {
  granted: boolean;
  permission: NotificationPermission;
  fcmToken?: string;
  error?: string;
}

class FirebaseNotificationService {
  private isInitialized = false;
  private messageHandlers: ((payload: any) => void)[] = [];

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.warn('Firebase config missing. Push notifications disabled.');
        return;
      }

      app = initializeApp(firebaseConfig);

      if (isWeb) {
        // Web-only setup
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
          console.warn('Web notifications not supported in this browser');
          return;
        }

        messaging = getMessaging(app);
        this.isInitialized = true;

        onMessage(messaging, (payload) => {
          console.log('Received web foreground message:', payload);
          this.handleForegroundMessage(payload);
        });

      } else {
        // Mobile setup
        this.isInitialized = true;
        this.setupMobilePushNotifications();
      }

      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.isInitialized = false;
    }
  }

  private async setupMobilePushNotifications() {
    try {
      const permResult = await PushNotifications.requestPermissions();

      if (permResult.receive !== 'granted') {
        console.warn('Mobile notification permission denied');
        return;
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('Mobile FCM token:', token.value);
        this.registerTokenWithBackend(token.value);
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Push registration error:', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Mobile notification received:', notification);
        this.handleForegroundMessage({
          notification: {
            title: notification.title,
            body: notification.body
          },
          data: notification.data
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Notification clicked:', notification);
        const data = notification.notification.data;
        if (data?.type === 'task_auto_start' && data.taskId) {
          console.log('Task auto-start notification clicked:', data.taskId);
        }
      });

    } catch (error) {
      console.error('Failed to setup mobile push notifications:', error);
    }
  }

  private handleForegroundMessage(payload: any) {
    this.messageHandlers.forEach(handler => {
      try { handler(payload); } catch (err) { console.error(err); }
    });

    if (payload.notification && isWeb && document.visibilityState === 'visible') {
      this.showBrowserNotification(payload.notification, payload.data);
    }
  }

  private showBrowserNotification(notification: any, data?: any) {
    if (Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: notification.body,
        icon: '/icon-192x192.png',
        badge: '/icon-badge.png',
        tag: data?.type || 'focuslock',
        requireInteraction: data?.type === 'focus_violation',
        data,
      };

      const browserNotification = new Notification(notification.title, options);
      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
      };
    }
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (isNative) {
      try {
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== 'granted') {
          return { granted: false, permission: 'denied', error: 'User denied mobile permission' };
        }

        await PushNotifications.register();
        return { granted: true, permission: 'granted', fcmToken: 'mobile-token' };
      } catch (error) {
        return { granted: false, permission: 'denied', error: `${error}` };
      }
    }

    // Web
    if (!this.isInitialized || !messaging) {
      return { granted: false, permission: 'denied', error: 'Firebase not initialized' };
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        return { granted: false, permission, error: 'User denied web permission' };
      }

      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (!fcmToken) {
        return { granted: false, permission, error: 'Failed to get web FCM token' };
      }

      await this.registerTokenWithBackend(fcmToken);
      return { granted: true, permission, fcmToken };

    } catch (error) {
      return { granted: false, permission: Notification.permission, error: `${error}` };
    }
  }

  private async registerTokenWithBackend(fcmToken: string) {
    try {
      await apiRequest('POST', '/api/fcm/register', { fcmToken });
      console.log('FCM token registered successfully');
    } catch (error) {
      console.error('Failed to register FCM token:', error);
    }
  }

  onMessage(handler: (payload: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) this.messageHandlers.splice(index, 1);
    };
  }

  isReady(): boolean { return this.isInitialized; }
  getCurrentPermission(): NotificationPermission { return Notification.permission; }
}

export const firebaseNotificationService = new FirebaseNotificationService();

// Service worker for web
export const registerServiceWorker = async () => {
  if (isWeb && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('Service Worker registered successfully:', registration);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }
  return null;
};
