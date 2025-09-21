import { useState, useEffect, useCallback } from 'react';
import { firebaseNotificationService, registerServiceWorker, type NotificationPermissionStatus } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isEnabled: boolean;
  isLoading: boolean;
  fcmToken?: string;
  error?: string;
}

export function usePushNotifications() {
  const { toast } = useToast();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    permission: 'default',
    isEnabled: false,
    isLoading: true,
  });

  // Initialize push notifications
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true }));

        // Check if notifications are supported
        const isSupported = 'Notification' in window && 'serviceWorker' in navigator;
        
        if (!isSupported) {
          setState(prev => ({
            ...prev,
            isSupported: false,
            isLoading: false,
            error: 'Push notifications are not supported in this browser'
          }));
          return;
        }

        // Register service worker
        await registerServiceWorker();

        // Check current permission and Firebase readiness
        const permission = Notification.permission;
        const isFirebaseReady = firebaseNotificationService.isReady();

        setState(prev => ({
          ...prev,
          isSupported: true,
          permission,
          isEnabled: permission === 'granted' && isFirebaseReady,
          isLoading: false,
          error: !isFirebaseReady ? 'Firebase configuration missing' : undefined
        }));

      } catch (error) {
        console.error('Failed to initialize push notifications:', error);
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: `Initialization failed: ${error}`
        }));
      }
    };

    initializeNotifications();
  }, []);

  // Set up message listeners when enabled
  useEffect(() => {
    if (!state.isEnabled) return;

    const unsubscribe = firebaseNotificationService.onMessage((payload) => {
      console.log('Received push notification:', payload);
      
      // Show toast notification for foreground messages
      if (payload.notification) {
        const notificationType = payload.data?.type;
        let toastVariant: 'default' | 'destructive' = 'default';
        
        if (notificationType === 'focus_violation') {
          toastVariant = 'destructive';
        }

        toast({
          title: payload.notification.title,
          description: payload.notification.body,
          variant: toastVariant,
        });
      }
    });

    return unsubscribe;
  }, [state.isEnabled, toast]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!state.isSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser',
        variant: 'destructive',
      });
      return false;
    }

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const result: NotificationPermissionStatus = await firebaseNotificationService.requestPermission();

      if (result.granted) {
        setState(prev => ({
          ...prev,
          permission: result.permission,
          isEnabled: true,
          fcmToken: result.fcmToken,
          isLoading: false,
          error: undefined
        }));

        toast({
          title: '🔔 Notifications Enabled',
          description: 'You\'ll now receive push notifications for task alerts and focus violations',
        });

        return true;
      } else {
        setState(prev => ({
          ...prev,
          permission: result.permission,
          isEnabled: false,
          isLoading: false,
          error: result.error
        }));

        if (result.permission === 'denied') {
          toast({
            title: 'Permission Denied',
            description: 'Please enable notifications in your browser settings to receive push alerts',
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Setup Failed',
            description: result.error || 'Failed to set up push notifications',
            variant: 'destructive',
          });
        }

        return false;
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: `Failed to request permission: ${error}`
      }));

      toast({
        title: 'Error',
        description: 'An error occurred while setting up notifications',
        variant: 'destructive',
      });

      return false;
    }
  }, [state.isSupported, toast]);

  const disableNotifications = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const success = await firebaseNotificationService.unregisterNotifications();
      
      setState(prev => ({
        ...prev,
        isEnabled: false,
        fcmToken: undefined,
        isLoading: false,
        error: undefined
      }));

      if (success) {
        toast({
          title: '🔕 Notifications Disabled',
          description: 'Push notifications have been turned off',
        });
      }

      return success;
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      
      toast({
        title: 'Error',
        description: 'Failed to disable notifications',
        variant: 'destructive',
      });

      return false;
    }
  }, [toast]);

  const testNotification = useCallback(() => {
    if (state.permission === 'granted') {
      new Notification('🧪 Test Notification', {
        body: 'FocusLock push notifications are working correctly!',
        icon: '/icon-192x192.png',
        tag: 'test',
      });
    }
  }, [state.permission]);

  return {
    ...state,
    requestPermission,
    disableNotifications,
    testNotification,
  };
}