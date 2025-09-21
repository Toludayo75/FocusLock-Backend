import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { apiRequest } from './queryClient';

// Firebase configuration - these would normally come from environment variables
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
      // Check if Firebase config is available
      if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.warn('Firebase configuration not available. Push notifications will be disabled.');
        return;
      }

      // Check if service worker and messaging are supported
      if (!('serviceWorker' in navigator) || !('Notification' in window)) {
        console.warn('Browser does not support service workers or notifications');
        return;
      }

      app = initializeApp(firebaseConfig);
      messaging = getMessaging(app);
      this.isInitialized = true;

      // Set up message listener for foreground notifications
      if (messaging) {
        onMessage(messaging, (payload) => {
          console.log('Received foreground message:', payload);
          this.handleForegroundMessage(payload);
        });
      }

      console.log('Firebase initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.isInitialized = false;
    }
  }

  private handleForegroundMessage(payload: any) {
    // Notify all registered handlers
    this.messageHandlers.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    });

    // Show browser notification if app is visible
    if (payload.notification && document.visibilityState === 'visible') {
      this.showBrowserNotification(payload.notification, payload.data);
    }
  }

  private showBrowserNotification(notification: any, data?: any) {
    if (Notification.permission === 'granted') {
      const options: NotificationOptions = {
        body: notification.body,
        icon: '/icon-192x192.png', // You'll need to add this icon
        badge: '/icon-badge.png',
        tag: data?.type || 'focuslock',
        requireInteraction: data?.type === 'focus_violation',
        data: data,
      };

      const browserNotification = new Notification(notification.title, options);

      browserNotification.onclick = () => {
        window.focus();
        browserNotification.close();
        
        // Handle notification click based on type
        if (data?.type === 'task_auto_start' && data.taskId) {
          // You could navigate to the task or show task details
          console.log('Task auto-start notification clicked:', data.taskId);
        } else if (data?.type === 'focus_violation') {
          console.log('Focus violation notification clicked');
        }
      };
    }
  }

  async requestPermission(): Promise<NotificationPermissionStatus> {
    if (!this.isInitialized || !messaging) {
      return {
        granted: false,
        permission: 'denied',
        error: 'Firebase not initialized'
      };
    }

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        return {
          granted: false,
          permission,
          error: 'User denied notification permission'
        };
      }

      // Get FCM token
      const fcmToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      
      if (!fcmToken) {
        return {
          granted: false,
          permission,
          error: 'Failed to get FCM token'
        };
      }

      // Register token with backend
      await this.registerTokenWithBackend(fcmToken);

      return {
        granted: true,
        permission,
        fcmToken
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return {
        granted: false,
        permission: Notification.permission,
        error: `Failed to setup notifications: ${error}`
      };
    }
  }

  private async registerTokenWithBackend(fcmToken: string) {
    try {
      await apiRequest('/api/fcm/register', {
        method: 'POST',
        body: JSON.stringify({ fcmToken }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
      console.log('FCM token registered successfully');
    } catch (error) {
      console.error('Failed to register FCM token:', error);
      throw error;
    }
  }

  async unregisterNotifications(): Promise<boolean> {
    try {
      await apiRequest('/api/fcm/unregister', {
        method: 'DELETE',
      });
      console.log('FCM token unregistered successfully');
      return true;
    } catch (error) {
      console.error('Failed to unregister FCM token:', error);
      return false;
    }
  }

  onMessage(handler: (payload: any) => void) {
    this.messageHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  isReady(): boolean {
    return this.isInitialized && messaging !== null;
  }

  getCurrentPermission(): NotificationPermission {
    return Notification.permission;
  }
}

// Export singleton instance
export const firebaseNotificationService = new FirebaseNotificationService();

// Service worker registration for background notifications
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
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