import * as admin from 'firebase-admin';
class FirebaseService {
    isInitialized = false;
    constructor() {
        // Don't initialize Firebase in constructor - wait until first use
    }
    initializeFirebase() {
        try {
            // Check if Firebase is already initialized
            if (admin.apps && admin.apps.length > 0) {
                this.isInitialized = true;
                console.log('Firebase Admin already initialized');
                return;
            }
            // Initialize Firebase Admin with service account
            const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
            if (!serviceAccountKey) {
                console.warn('Firebase service account key not configured. Push notifications will be disabled.');
                return;
            }
            const serviceAccount = JSON.parse(serviceAccountKey);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            this.isInitialized = true;
            console.log('Firebase Admin initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize Firebase Admin:', error);
            this.isInitialized = false;
        }
    }
    async sendTaskAutoStartNotification(notification, fcmToken) {
        if (!this.isInitialized) {
            this.initializeFirebase(); // Initialize on first use
            if (!this.isInitialized) {
                console.warn('🔶 Firebase not initialized, skipping push notification for task:', notification.taskId);
                return false;
            }
        }
        if (!fcmToken) {
            console.warn('🔶 FCM token missing, cannot send notification for task:', notification.taskId);
            return false;
        }
        try {
            const payload = {
                title: '🎯 Task Started!',
                body: `"${notification.taskTitle}" has begun. Stay focused!`,
                data: {
                    type: 'task_auto_start',
                    taskId: notification.taskId,
                    userId: notification.userId,
                    strictLevel: notification.strictLevel.toString(),
                    durationMinutes: notification.durationMinutes.toString(),
                },
            };
            const message = {
                token: fcmToken,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data,
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'task_notifications',
                        priority: 'high',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            badge: 1,
                            sound: 'default',
                        },
                    },
                },
            };
            const response = await admin.messaging().send(message);
            console.log('Task auto-start notification sent successfully:', response);
            return true;
        }
        catch (error) {
            console.error('Failed to send task auto-start notification:', error);
            return false;
        }
    }
    async sendFocusViolationNotification(notification, fcmToken) {
        if (!this.isInitialized) {
            this.initializeFirebase(); // Initialize on first use
            if (!this.isInitialized) {
                console.warn('Firebase not initialized, skipping push notification');
                return false;
            }
        }
        try {
            const violationMessages = {
                app_switch: `🚫 Focus broken! You tried to access ${notification.blockedApp || 'a blocked app'} during "${notification.taskTitle}".`,
                task_close: `⚠️ Task interrupted! "${notification.taskTitle}" was closed unexpectedly.`,
                uninstall_attempt: `🛡️ Uninstall blocked! Cannot remove FocusLock during active task "${notification.taskTitle}".`,
            };
            const payload = {
                title: '🚫 Focus Violation Detected',
                body: violationMessages[notification.violationType],
                data: {
                    type: 'focus_violation',
                    taskId: notification.taskId,
                    userId: notification.userId,
                    violationType: notification.violationType,
                    blockedApp: notification.blockedApp || '',
                },
            };
            const message = {
                token: fcmToken,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data,
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'violation_notifications',
                        priority: 'high',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                        color: '#ff4444', // Red color for violations
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            badge: 1,
                            sound: 'default',
                        },
                    },
                },
            };
            const response = await admin.messaging().send(message);
            console.log('Focus violation notification sent successfully:', response);
            return true;
        }
        catch (error) {
            console.error('Failed to send focus violation notification:', error);
            return false;
        }
    }
    async sendBulkNotifications(tokens, payload) {
        if (!this.isInitialized) {
            this.initializeFirebase(); // Initialize on first use
            if (!this.isInitialized) {
                throw new Error('Firebase not initialized');
            }
        }
        const message = {
            tokens: tokens,
            notification: {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl,
            },
            data: payload.data,
            android: {
                priority: 'high',
                notification: {
                    channelId: 'general_notifications',
                    priority: 'high',
                    defaultSound: true,
                    defaultVibrateTimings: true,
                },
            },
        };
        return await admin.messaging().sendEachForMulticast(message);
    }
    async validateToken(fcmToken) {
        if (!this.isInitialized) {
            this.initializeFirebase(); // Initialize on first use
            if (!this.isInitialized) {
                return false;
            }
        }
        try {
            // Send a dry-run message to validate the token
            await admin.messaging().send({
                token: fcmToken,
                notification: {
                    title: 'Test',
                    body: 'Test',
                },
            }, true); // dry-run mode
            return true;
        }
        catch (error) {
            console.log('FCM token validation failed:', error);
            return false;
        }
    }
    isReady() {
        if (!this.isInitialized) {
            this.initializeFirebase(); // Initialize on first use
        }
        return this.isInitialized;
    }
}
// Export singleton instance
export const firebaseService = new FirebaseService();
//# sourceMappingURL=firebase-service.js.map