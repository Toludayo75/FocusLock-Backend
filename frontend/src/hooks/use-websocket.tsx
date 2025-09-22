import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';
import { useMobileEnforcement } from './use-mobile-enforcement';
import { apiRequest } from '../lib/queryClient';
import { firebaseNotificationService } from '../lib/firebase';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeenTasksRef = useRef<Set<string>>(new Set());
  const wsFailureCountRef = useRef<number>(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wsConnected, setWsConnected] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const mobileEnforcement = useMobileEnforcement();

  // Enhanced task auto-start handler with push notification logging
  const handleTaskAutoStart = useCallback(async (data: {
    taskId: string;
    title: string;
    userId: string;
    strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
    targetApps: string[];
    durationMinutes: number;
    pdfFileUrl: string | null;
  }, source: 'websocket' | 'polling' = 'websocket') => {
    // Prevent duplicate triggers
    if (lastSeenTasksRef.current.has(data.taskId)) {
      return;
    }
    lastSeenTasksRef.current.add(data.taskId);

    console.log(`🎯 Processing task auto-start via ${source}:`, data.title);
    
    // If task detected via HTTP polling (WebSocket failure), note it for push notification reliability
    if (source === 'polling') {
      console.log('📱 Task detected via HTTP polling - WebSocket backup working');
      wsFailureCountRef.current += 1;
    } else if (source === 'websocket') {
      // Reset failure count on successful WebSocket detection
      wsFailureCountRef.current = 0;
    }
    
    // Invalidate tasks query to refresh the UI
    queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
    
    // 🚀 AUTOMATICALLY START MOBILE ENFORCEMENT
    try {
      const enforcementStarted = await mobileEnforcement.startEnforcement({
        strictLevel: data.strictLevel,
        targetApps: data.targetApps,
        durationMinutes: data.durationMinutes
      });
      
      if (enforcementStarted) {
        console.log('✅ Mobile enforcement started automatically for task:', data.title);
      } else {
        console.log('⚠️ Mobile enforcement failed to start for task:', data.title);
      }
    } catch (error) {
      console.error('❌ Error starting mobile enforcement:', error);
    }
    
    // Show toast notification with source indicator
    toast({
      title: "Task Started Automatically",
      description: `"${data.title}" has started and enforcement is now active ${source === 'polling' ? '(via backup system)' : ''}`,
      duration: 5000,
    });

    // Optional: Open PDF if it exists
    if (data.pdfFileUrl) {
      const pdfWindow = window.open(data.pdfFileUrl, '_blank');
      if (pdfWindow) {
        console.log('📄 Auto-opened PDF:', data.pdfFileUrl);
      }
    }
  }, [mobileEnforcement, toast]);

  // Check for active tasks via HTTP
  const checkForActiveTasks = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await apiRequest('GET', '/api/tasks/active');
      const activeTasks = response.data;

      for (const task of activeTasks) {
        // Only trigger enforcement for tasks we haven't seen before
        if (!lastSeenTasksRef.current.has(task.id)) {
          console.log('🆕 Found new active task via HTTP polling:', task.title);
          
          await handleTaskAutoStart({
            taskId: task.id,
            title: task.title,
            userId: task.userId,
            strictLevel: task.strictLevel,
            targetApps: task.targetApps,
            durationMinutes: task.durationMinutes,
            pdfFileUrl: task.pdfFileUrl
          }, 'polling'); // Mark as polling source for tracking
        }
      }
    } catch (error) {
      console.error('❌ Error checking for active tasks:', error);
    }
  }, [user?.id, handleTaskAutoStart]);

  // Enhanced HTTP polling fallback with push notification awareness
  const startHttpPolling = useCallback(() => {
    if (pollingIntervalRef.current) return; // Already polling

    console.log('🔄 Starting HTTP polling fallback (WebSocket disconnected)...');
    
    // Note WebSocket failure for push notification reliability tracking
    if (firebaseNotificationService.isReady()) {
      console.log('📱 Push notifications available as additional backup layer');
    } else {
      console.warn('⚠️ Push notifications not available - relying solely on HTTP polling');
    }
    
    pollingIntervalRef.current = setInterval(async () => {
      if (!user?.id || wsConnected) {
        // Stop polling if no user or WebSocket reconnected
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          
          if (wsConnected) {
            console.log('✅ WebSocket reconnected - stopping HTTP polling');
          }
        }
        return;
      }

      console.log('🔍 HTTP polling check (WebSocket down)...');
      await checkForActiveTasks();
    }, 15000); // Check every 15 seconds
    
    // Check immediately
    checkForActiveTasks();
  }, [user?.id, wsConnected, checkForActiveTasks]);

  // WebSocket setup effect
  useEffect(() => {
    if (!user?.id) {
      // Clean up existing connection if user logs out
      if (socketRef.current) {
        console.log('🔌 Disconnecting WebSocket (user logged out)');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setWsConnected(false);
      return;
    }

    // Prevent duplicate connections
    if (socketRef.current && socketRef.current.connected) {
      return;
    }

    console.log('🔌 Setting up WebSocket connection for user:', user.id);

    // Connect to WebSocket server using the Vite proxy setup
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    
    socketRef.current = io(wsUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.5,
      timeout: 20000,
      transports: ['websocket', 'polling'],
      path: '/socket.io'
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      setWsConnected(true);
      
      // Stop HTTP polling when WebSocket connects
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log('⏹️ Stopped HTTP polling (WebSocket connected)');
      }
      
      // Join user-specific room for secure messaging
      if (user?.id) {
        socket.emit('joinUserRoom', user.id);
        console.log('Joined user room:', user.id);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from WebSocket server:', reason);
      setWsConnected(false);
      
      // Start HTTP polling fallback when WebSocket disconnects (but not if it's due to intentional logout)
      if (user?.id && !pollingIntervalRef.current && reason !== 'io client disconnect') {
        console.log('🔄 Starting HTTP polling fallback due to disconnect:', reason);
        startHttpPolling();
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      // HTTP polling will be started automatically on disconnect
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
    });
    
    socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    socket.on('taskAutoStarted', async (data: {
      taskId: string;
      title: string;
      userId: string;
      strictLevel: 'SOFT' | 'MEDIUM' | 'HARD';
      targetApps: string[];
      durationMinutes: number;
      pdfFileUrl: string | null;
    }) => {
      console.log('🚀 Task auto-started via WebSocket:', data);
      
      // Prevent duplicate triggers
      if (lastSeenTasksRef.current.has(data.taskId)) {
        return;
      }
      lastSeenTasksRef.current.add(data.taskId);

      console.log(`🎯 Processing task auto-start via websocket:`, data.title);
      
      // Invalidate tasks query to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/tasks'] });
      
      // 🚀 AUTOMATICALLY START MOBILE ENFORCEMENT
      try {
        const enforcementStarted = await mobileEnforcement.startEnforcement({
          strictLevel: data.strictLevel,
          targetApps: data.targetApps,
          durationMinutes: data.durationMinutes
        });
        
        if (enforcementStarted) {
          console.log('✅ Mobile enforcement started automatically for task:', data.title);
        } else {
          console.log('⚠️ Mobile enforcement failed to start for task:', data.title);
        }
      } catch (error) {
        console.error('❌ Error starting mobile enforcement:', error);
      }
      
      // Show toast notification
      toast({
        title: "Task Started Automatically",
        description: `"${data.title}" has started and enforcement is now active`,
        duration: 5000,
      });

      // Optional: Open PDF if it exists
      if (data.pdfFileUrl) {
        const pdfWindow = window.open(data.pdfFileUrl, '_blank');
        if (pdfWindow) {
          console.log('📄 Auto-opened PDF:', data.pdfFileUrl);
        }
      }
    });

    return () => {
      // Cleanup on component unmount only
      console.log('🧹 WebSocket useEffect cleanup');
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [user?.id]); // Only depend on user?.id to prevent reconnection loops

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('📶 Network came online');
      setIsOnline(true);
      // Reconnect WebSocket if needed
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect();
      }
    };

    const handleOffline = () => {
      console.log('📵 Network went offline');
      setIsOnline(false);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden && user?.id) {
        // App came to foreground, check for missed tasks
        console.log('🔍 App resumed, checking for active tasks...');
        checkForActiveTasks();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.id, checkForActiveTasks]);

  return {
    socket: socketRef.current,
    isConnected: wsConnected,
    isOnline,
  };
};