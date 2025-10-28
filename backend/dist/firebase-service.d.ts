import * as admin from 'firebase-admin';
interface PushNotificationPayload {
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
}
interface TaskAutoStartNotification {
    taskId: string;
    taskTitle: string;
    userId: string;
    strictLevel: string;
    durationMinutes: number;
}
interface FocusViolationNotification {
    taskId: string;
    taskTitle: string;
    userId: string;
    violationType: 'app_switch' | 'task_close' | 'uninstall_attempt';
    blockedApp?: string;
}
declare class FirebaseService {
    private isInitialized;
    constructor();
    private initializeFirebase;
    sendTaskAutoStartNotification(notification: TaskAutoStartNotification, fcmToken: string): Promise<boolean>;
    sendFocusViolationNotification(notification: FocusViolationNotification, fcmToken: string): Promise<boolean>;
    sendBulkNotifications(tokens: string[], payload: PushNotificationPayload): Promise<admin.messaging.BatchResponse>;
    validateToken(fcmToken: string): Promise<boolean>;
    isReady(): boolean;
}
export declare const firebaseService: FirebaseService;
export {};
//# sourceMappingURL=firebase-service.d.ts.map