import type { Express } from "express";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { z } from "zod";
import { Task, InsertTask, User as AppUser } from "./schema.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const insertTaskSchema = z.object({
  title: z.string().min(1),
  startAt: z.string(),
  durationMinutes: z.number().min(1).max(480),
  strictLevel: z.enum(['SOFT', 'MEDIUM', 'HARD']),
  targetApps: z.array(z.string()),
  proofMethods: z.array(z.string()),
});

const insertUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
});

declare global {
  namespace Express {
    interface User extends AppUser {}
  }
}

export function registerRoutes(app: Express): void {
  // Health check endpoint for WebSocket fallback
  app.get("/healthz", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Setup authentication routes
  setupAuth(app);

  // Task routes
  // Get active tasks for current user (HTTP polling fallback)
  app.get("/api/tasks/active", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const activeTasks = await storage.getActiveTasksByUser(req.user!.id);
      res.json(activeTasks);
    } catch (error) {
      console.error("Error fetching active tasks:", error);
      res.status(500).json({ message: "Failed to fetch active tasks" });
    }
  });

  app.get("/api/tasks/today", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const tasks = await storage.getTasksByUser(req.user!.id, 'today');
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching today's tasks:", error);
      res.status(500).json({ message: "Failed to fetch today's tasks" });
    }
  });

  app.get("/api/tasks/week", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const tasks = await storage.getTasksByUser(req.user!.id, 'week');
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching week's tasks:", error);
      res.status(500).json({ message: "Failed to fetch week's tasks" });
    }
  });

  app.get("/api/tasks", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { range } = req.query;
      const tasks = await storage.getTasksByUser(req.user!.id, range as string);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  // Configure multer for PDF uploads
  const storage_config = multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadPath = path.join(process.cwd(), 'uploads', 'pdfs');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
    }
  });

  const upload = multer({
    storage: storage_config,
    fileFilter: (req, file, cb) => {
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed'));
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024 // 10MB limit
    }
  });

  // Auth middleware to prevent unauthorized file uploads
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  app.post("/api/tasks", requireAuth, upload.single('pdfFile'), async (req, res) => {

    try {
      // Parse form data - handle both JSON and multipart/form-data
      const formData = {
        title: req.body.title,
        startAt: req.body.startAt,
        durationMinutes: parseInt(req.body.durationMinutes),
        strictLevel: req.body.strictLevel,
        targetApps: Array.isArray(req.body.targetApps) 
          ? req.body.targetApps 
          : JSON.parse(req.body.targetApps || '[]'),
        proofMethods: Array.isArray(req.body.proofMethods) 
          ? req.body.proofMethods 
          : JSON.parse(req.body.proofMethods || '["screenshot"]'),
      };

      const taskData = insertTaskSchema.parse(formData);
      
      // Validate that at least one of target apps or PDF file is provided
      if (taskData.targetApps.length === 0 && !req.file) {
        return res.status(400).json({ 
          message: "Provide target apps or a PDF file. At least one is required." 
        });
      }
      
      let pdfFileUrl = null;
      if (req.file) {
        // Store relative path to uploaded PDF
        pdfFileUrl = `/uploads/pdfs/${req.file.filename}`;
      }

      const task = await storage.createTask({
        ...taskData,
        userId: req.user!.id,
        endAt: new Date(new Date(taskData.startAt).getTime() + taskData.durationMinutes * 60000).toISOString(),
        pdfFileUrl: pdfFileUrl,
        status: 'PENDING' as const,
      });
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Verify task ownership before updating
      const existingTask = await storage.getTask(id);
      if (!existingTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (existingTask.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied. You can only modify your own tasks." });
      }
      
      // Whitelist allowed fields and strip protected fields
      const allowedFields = ['title', 'startAt', 'durationMinutes', 'strictLevel', 'targetApps', 'proofMethods', 'status'];
      const filteredUpdates: any = {};
      for (const field of allowedFields) {
        if (updates[field] !== undefined) {
          filteredUpdates[field] = updates[field];
        }
      }
      
      // Recalculate endAt if startAt or durationMinutes changed
      if (filteredUpdates.startAt || filteredUpdates.durationMinutes) {
        const startAt = filteredUpdates.startAt || existingTask.startAt;
        const durationMinutes = filteredUpdates.durationMinutes || existingTask.durationMinutes;
        filteredUpdates.endAt = new Date(new Date(startAt).getTime() + durationMinutes * 60000).toISOString();
      }
      
      const task = await storage.updateTask(id, filteredUpdates);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { id } = req.params;
      const deleted = await storage.deleteTask(id, req.user!.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // Enforcement routes
  app.post("/api/enforcement/sessions", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { taskId, deviceId } = req.body;
      
      // Verify task ownership before creating enforcement session
      const task = await storage.getTask(taskId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied. You can only create sessions for your own tasks." });
      }
      
      const session = await storage.createEnforcementSession({
        taskId,
        deviceId: deviceId || 'web-device',
        status: 'PENDING',
        userId: req.user!.id,
      });
      res.status(201).json(session);
    } catch (error) {
      console.error("Error creating enforcement session:", error);
      res.status(500).json({ message: "Failed to create enforcement session" });
    }
  });

  app.patch("/api/enforcement/sessions/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { id } = req.params;
      const { status } = req.body;
      
      // Verify session ownership before updating status
      const existingSession = await storage.getEnforcementSession(id);
      if (!existingSession) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (existingSession.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied. You can only modify your own sessions." });
      }
      
      const session = await storage.updateEnforcementSession(id, { status });
      res.json(session);
    } catch (error) {
      console.error("Error updating enforcement session:", error);
      res.status(500).json({ message: "Failed to update enforcement session" });
    }
  });

  // Proof submission routes
  app.post("/api/proof/:sessionId/screenshot", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { sessionId } = req.params;
      
      // Verify session ownership before submitting proof
      const session = await storage.getEnforcementSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied. You can only submit proof for your own sessions." });
      }
      
      // In a real implementation, this would process the uploaded file
      const result = await storage.createProofAndUpdateSession({
        sessionId,
        method: 'screenshot',
        result: { valid: true },
        score: 100,
      }, sessionId, { status: 'UNLOCKED' });
      const proof = result.proof;
      
      res.json({ valid: true, proof });
    } catch (error) {
      console.error("Error processing screenshot proof:", error);
      res.status(500).json({ message: "Failed to process proof" });
    }
  });

  app.post("/api/proof/:sessionId/quiz", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { sessionId } = req.params;
      const { answers } = req.body;
      
      // Verify session ownership before submitting proof
      const session = await storage.getEnforcementSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied. You can only submit proof for your own sessions." });
      }
      
      // Simple quiz validation - in real app this would be more sophisticated
      const score = Object.keys(answers).length > 0 ? 85 : 0;
      const valid = score >= 70;
      
      let proof;
      let updatedSession;
      
      if (valid) {
        const result = await storage.createProofAndUpdateSession({
          sessionId,
          method: 'quiz',
          result: { answers, valid },
          score,
        }, sessionId, { status: 'UNLOCKED' });
        proof = result.proof;
        updatedSession = result.session;
      } else {
        proof = await storage.createProof({
          sessionId,
          method: 'quiz',
          result: { answers, valid },
          score,
        });
      }
      
      res.json({ valid, score, proof });
    } catch (error) {
      console.error("Error processing quiz proof:", error);
      res.status(500).json({ message: "Failed to process proof" });
    }
  });

  app.post("/api/proof/:sessionId/checkin", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { sessionId } = req.params;
      const { text } = req.body;
      
      // Verify session ownership before submitting proof
      const session = await storage.getEnforcementSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      if (session.userId !== req.user!.id) {
        return res.status(403).json({ message: "Access denied. You can only submit proof for your own sessions." });
      }
      
      // Simple text validation - in real app this would use NLP
      const valid = text && text.length > 20;
      const score = valid ? 90 : 0;
      
      let proof;
      let updatedSession;
      
      if (valid) {
        const result = await storage.createProofAndUpdateSession({
          sessionId,
          method: 'checkin',
          result: { text, valid },
          score,
        }, sessionId, { status: 'UNLOCKED' });
        proof = result.proof;
        updatedSession = result.session;
      } else {
        proof = await storage.createProof({
          sessionId,
          method: 'checkin',
          result: { text, valid },
          score,
        });
      }
      
      res.json({ valid, proof });
    } catch (error) {
      console.error("Error processing checkin proof:", error);
      res.status(500).json({ message: "Failed to process proof" });
    }
  });

  // FCM token management routes
  // Firebase config endpoint for service worker
  app.get("/api/firebase-config", (req, res) => {
    // Return only public Firebase configuration needed for service worker
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
      projectId: process.env.FIREBASE_PROJECT_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || '',
    };

    // Check if Firebase is properly configured
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      return res.status(503).json({ 
        error: "Firebase not configured",
        message: "Firebase environment variables are not set"
      });
    }

    res.json({ firebaseConfig });
  });

  app.post("/api/fcm/register", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { fcmToken } = req.body;
      
      if (!fcmToken || typeof fcmToken !== 'string') {
        return res.status(400).json({ message: "Valid FCM token is required" });
      }

      const updatedUser = await storage.updateUserFcmToken(req.user!.id, fcmToken);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "FCM token registered successfully" });
    } catch (error) {
      console.error("Error registering FCM token:", error);
      res.status(500).json({ message: "Failed to register FCM token" });
    }
  });

  app.delete("/api/fcm/unregister", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const updatedUser = await storage.updateUserFcmToken(req.user!.id, null);
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "FCM token removed successfully" });
    } catch (error) {
      console.error("Error removing FCM token:", error);
      res.status(500).json({ message: "Failed to remove FCM token" });
    }
  });

  // Focus violation reporting endpoint
  app.post("/api/violations/report", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const { taskId, violationType, blockedApp } = req.body;
      
      // Import and use Firebase service here to send violation notification
      const { firebaseService } = await import('./firebase-service.js');
      
      if (firebaseService.isReady() && req.user!.fcmToken) {
        await firebaseService.sendFocusViolationNotification({
          taskId,
          taskTitle: 'Active Task', // You might want to fetch the actual task title
          userId: req.user!.id,
          violationType,
          blockedApp
        }, req.user!.fcmToken);
      }
      
      res.json({ message: "Violation reported successfully" });
    } catch (error) {
      console.error("Error reporting violation:", error);
      res.status(500).json({ message: "Failed to report violation" });
    }
  });

  // Stats and progress routes
  app.get("/api/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const stats = await storage.getUserStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/progress/stats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const stats = await storage.getProgressStats(req.user!.id);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching progress stats:", error);
      res.status(500).json({ message: "Failed to fetch progress stats" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });
}
