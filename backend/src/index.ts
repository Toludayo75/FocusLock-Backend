import dotenv from "dotenv";
dotenv.config({ path: "../.env" });

import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { registerRoutes } from "./routes.js";
import { storage } from "./storage.js";

// Import Firebase service AFTER environment variables are loaded
import { firebaseService } from "./firebase-service.js";

// Secure origin checking function
function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  // Handle null origin (file://, some mobile clients)
  if (origin === 'null') return false;
  
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    const port = url.port;
    
    return allowedOrigins.some(allowed => {
      try {
        // If pattern contains wildcard, handle subdomain matching
        if (allowed.includes('*')) {
          // Extract the domain pattern (e.g., "*.replit.dev" -> "replit.dev")
          const domainPattern = allowed.replace('*.', '');
          const allowedUrl = new URL(`https://${domainPattern}`);
          const allowedHostname = allowedUrl.hostname;
          
          // Check if hostname exactly matches or is a subdomain
          return hostname === allowedHostname || hostname.endsWith('.' + allowedHostname);
        } else {
          // Exact match comparison
          const allowedUrl = new URL(allowed);
          return hostname === allowedUrl.hostname && 
                 (port === allowedUrl.port || (!port && !allowedUrl.port));
        }
      } catch {
        // If URL parsing fails, fall back to string comparison
        return origin === allowed;
      }
    });
  } catch {
    // If origin URL parsing fails, it's invalid
    return false;
  }
}

const app = express();
const server = createServer(app);

// Get CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

const isDevelopment = process.env.NODE_ENV !== 'production';
if (isDevelopment) {
  allowedOrigins.push('http://localhost:5000', 'http://localhost:3000');
  // Add Replit development domains
  allowedOrigins.push('https://*.replit.dev', 'https://*.repl.co');
}

const io = new Server(server, {
  cors: {
    origin: function(origin, callback) {
      // Allow no origin only in development (mobile apps, curl)
      if (!origin && isDevelopment) {
        return callback(null, true);
      }
      
      // Allow mobile client null origins in development
      if (origin === 'null' && isDevelopment) {
        return callback(null, true);
      }
      
      if (origin && isOriginAllowed(origin, allowedOrigins)) {
        return callback(null, true);
      }
      
      // In production, reject unknown origins
      if (!isDevelopment) {
        console.warn(`WebSocket CORS: Rejected origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'), false);
      }
      
      // In development, be more permissive but log warnings
      console.warn(`WebSocket CORS: Allowing unregistered origin in development: ${origin}`);
      return callback(null, true);
    },
    methods: ["GET", "POST"],
    credentials: true
  },
  // Mobile-optimized settings for reliability
  pingTimeout: 60000, // 1 minute
  pingInterval: 25000, // 25 seconds
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// Middleware - Secure CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow no origin only in development (mobile apps, curl)
    if (!origin && isDevelopment) {
      return callback(null, true);
    }
    
    // Allow mobile client null origins in development
    if (origin === 'null' && isDevelopment) {
      return callback(null, true);
    }
    
    if (origin && isOriginAllowed(origin, allowedOrigins)) {
      return callback(null, true);
    }
    
    // In production, reject unknown origins
    if (!isDevelopment) {
      console.warn(`HTTP CORS: Rejected origin: ${origin}`);
      return callback(new Error('Not allowed by CORS'), false);
    }
    
    // In development, be more permissive but log warnings
    console.warn(`HTTP CORS: Allowing unregistered origin in development: ${origin}`);
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Routes
registerRoutes(app);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Background Task Scheduler
class TaskScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  
  start() {
    console.log('Starting background task scheduler...');
    
    // Check for due tasks every 30 seconds
    this.intervalId = setInterval(async () => {
      try {
        await this.checkAndStartDueTasks();
        await this.checkAndStopExpiredTasks();
      } catch (error) {
        console.error('Error in background task scheduler:', error);
      }
    }, 30000); // 30 seconds
    
    // Run once immediately on startup
    this.checkAndStartDueTasks();
    this.checkAndStopExpiredTasks();
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('Background task scheduler stopped.');
    }
  }
  
  private async checkAndStartDueTasks() {
    try {
      console.log('Checking for due tasks...');
      const pendingTasks = await storage.getPendingTasksDueToStart();
      console.log(`Found ${pendingTasks.length} pending tasks ready to start`);
      
      if (pendingTasks.length > 0) {
        for (const task of pendingTasks) {
          // Update task status to ACTIVE
          const updatedTask = await storage.updateTask(task.id, { status: 'ACTIVE' });
          
          if (updatedTask) {
            console.log(`Auto-started task: ${task.title} (ID: ${task.id}) for user: ${task.userId}`);
            
            // Get user information for push notification
            const user = await storage.getUser(task.userId);
            
            // Emit WebSocket event to specific user only (security fix)
            io.to(`user:${task.userId}`).emit('taskAutoStarted', {
              taskId: task.id,
              title: task.title,
              userId: task.userId, // FIXED: Include userId for frontend
              strictLevel: task.strictLevel,
              targetApps: task.targetApps,
              durationMinutes: task.durationMinutes,
              pdfFileUrl: task.pdfFileUrl
            });
            
            console.log(`Emitted taskAutoStarted event to user room: user:${task.userId}`);
            
            // Send push notification as backup/fallback
            if (firebaseService.isReady() && user?.fcmToken) {
              try {
                const notificationSent = await firebaseService.sendTaskAutoStartNotification({
                  taskId: task.id,
                  taskTitle: task.title,
                  userId: task.userId,
                  strictLevel: task.strictLevel,
                  durationMinutes: task.durationMinutes
                }, user.fcmToken);
                
                if (notificationSent) {
                  console.log(`✅ Push notification sent to user ${task.userId} for task: ${task.title}`);
                } else {
                  console.log(`❌ Failed to send push notification to user ${task.userId}`);
                }
              } catch (pushError) {
                console.error(`Error sending push notification to user ${task.userId}:`, pushError);
              }
            } else {
              if (!firebaseService.isReady()) {
                console.log(`⚠️ Firebase not ready - skipping push notification for user ${task.userId}`);
              } else if (!user?.fcmToken) {
                console.log(`⚠️ No FCM token for user ${task.userId} - skipping push notification`);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking for due tasks:', error);
    }
  }

  private async checkAndStopExpiredTasks() {
    try {
      console.log('Checking for expired tasks...');
      const expiredTasks = await storage.getActiveTasksDueToStop();
      console.log(`Found ${expiredTasks.length} expired tasks to stop`);
      
      if (expiredTasks.length > 0) {
        for (const task of expiredTasks) {
          // Mark task as COMPLETED since it has run its full duration
          const updatedTask = await storage.updateTask(task.id, { status: 'COMPLETED' });
          
          if (updatedTask) {
            console.log(`Auto-completed task: ${task.title} (ID: ${task.id}) for user: ${task.userId}`);
            
            // Get user information for push notification
            const user = await storage.getUser(task.userId);
            
            // Emit WebSocket event to specific user to notify task completion
            io.to(`user:${task.userId}`).emit('taskCompleted', {
              taskId: task.id,
              title: task.title,
              userId: task.userId,
              status: 'COMPLETED',
              completedAt: new Date().toISOString()
            });
            
            console.log(`Emitted taskCompleted event to user room: user:${task.userId}`);
            
            // TODO: Add task completion push notification later if needed
            console.log(`📱 Task completed - user ${task.userId} will be notified via WebSocket`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking for expired tasks:', error);
    }
  }
}

const taskScheduler = new TaskScheduler();

// Start server
const port = parseInt(process.env.BACKEND_PORT || '8000', 10);
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  
  // Start background task scheduler
  taskScheduler.start();
});

// Handle WebSocket connections
io.on('connection', (socket) => {
  console.log('Client connected to WebSocket:', socket.id);
  
  // Join user-specific room for secure messaging
  socket.on('joinUserRoom', (userId: string) => {
    socket.join(`user:${userId}`);
    console.log(`Client ${socket.id} joined room: user:${userId}`);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected from WebSocket:', socket.id, 'Reason:', reason);
  });
  
  socket.on('error', (error) => {
    console.error('WebSocket error for client:', socket.id, error);
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully...');
  taskScheduler.stop();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  taskScheduler.stop();
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});
