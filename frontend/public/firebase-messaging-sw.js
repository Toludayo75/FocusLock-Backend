// Firebase messaging service worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker
firebase.initializeApp({
  apiKey: "AIzaSyBL7YSiP1kx-E7O5_tmuZ2s4vtCecu5Gd4",
  authDomain: "focuslock-9195a.firebaseapp.com",
  projectId: "focuslock-9195a",
  storageBucket: "focuslock-9195a.firebasestorage.app",
  messagingSenderId: "1055023421536",
  appId: "1:1055023421536:web:2c94781907851faf49cb05"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'FocusLock';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/icon-badge.png',
    tag: payload.data?.type || 'focuslock',
    data: payload.data,
    requireInteraction: payload.data?.type === 'focus_violation',
    actions: []
  };

  // Add action buttons based on notification type
  if (payload.data?.type === 'task_auto_start') {
    notificationOptions.actions = [
      { action: 'view', title: 'View Task' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  } else if (payload.data?.type === 'focus_violation') {
    notificationOptions.actions = [
      { action: 'acknowledge', title: 'Got it' },
      { action: 'dismiss', title: 'Dismiss' }
    ];
  }

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  // Focus or open the app window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return;
        }
      }
      
      // Open new window if no existing window found
      if (clients.openWindow) {
        let url = '/';
        
        // Navigate to specific page based on notification type
        if (data?.type === 'task_auto_start' && data.taskId) {
          url = `/tasks?highlight=${data.taskId}`;
        } else if (data?.type === 'focus_violation') {
          url = '/tasks';
        }
        
        return clients.openWindow(url);
      }
    })
  );
});