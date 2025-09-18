import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { queryClient } from '../lib/queryClient';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';
import { useMobileEnforcement } from './use-mobile-enforcement';

export const useWebSocket = () => {
  const socketRef = useRef<Socket | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const mobileEnforcement = useMobileEnforcement();

  useEffect(() => {
    // Connect to WebSocket server using the Vite proxy setup
    // The /socket.io path is proxied to the backend server
    const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    
    socketRef.current = io(wsUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      path: '/socket.io'
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      
      // Join user-specific room for secure messaging
      if (user?.id) {
        socket.emit('joinUserRoom', user.id);
        console.log('Joined user room:', user.id);
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
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
      console.log('Task auto-started:', data);
      
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

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [toast, user?.id, mobileEnforcement]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
  };
};