// Firebase messaging service worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

let messaging = null;

// Initialize Firebase dynamically by fetching config from backend
async function initializeFirebase() {
  try {
    // Fetch Firebase config from backend endpoint
    const response = await fetch('/api/firebase-config');
    
    if (!response.ok) {
      console.error('Failed to fetch Firebase config:', response.status);
      return false;
    }
    
    const { firebaseConfig } = await response.json();
    
    // Initialize Firebase with config from environment variables
    firebase.initializeApp(firebaseConfig);
    messaging = firebase.messaging();
    
    console.log('Firebase initialized successfully in service worker');
    return true;
  } catch (error) {
    console.error('Error initializing Firebase in service worker:', error);
    return false;
  }
}

// Initialize Firebase and set up background message handler
initializeFirebase().then((initialized) => {
  if (initialized && messaging) {
    setupBackgroundMessageHandler();
  }
});

// Handle background messages
function setupBackgroundMessageHandler() {
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
}

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