import type { Express } from "express";
import { setupAuth } from "./auth.js";
import { storage } from "./storage.js";
import { z } from "zod";
import { Task, InsertTask, User } from "./schema.js";
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
    interface User extends User {}
  }
}

export function registerRoutes(app: Express): void {
  // Setup authentication routes
  setupAuth(app);

  // Task routes
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

  app.post("/api/tasks", upload.single('pdfFile'), async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Parse form data - JSON fields need to be parsed when using multipart/form-data
      const formData = {
        title: req.body.title,
        startAt: req.body.startAt,
        durationMinutes: parseInt(req.body.durationMinutes),
        strictLevel: req.body.strictLevel,
        targetApps: JSON.parse(req.body.targetApps || '[]'),
        proofMethods: JSON.parse(req.body.proofMethods || '["screenshot"]'),
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
      const task = await storage.updateTask(id, updates);
      
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
      // In a real implementation, this would process the uploaded file
      const proof = await storage.createProof({
        sessionId,
        method: 'screenshot',
        result: { valid: true },
        score: 100,
      });
      
      // Update session status to completed
      await storage.updateEnforcementSession(sessionId, { status: 'UNLOCKED' });
      
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
      
      // Simple quiz validation - in real app this would be more sophisticated
      const score = Object.keys(answers).length > 0 ? 85 : 0;
      const valid = score >= 70;
      
      const proof = await storage.createProof({
        sessionId,
        method: 'quiz',
        result: { answers, valid },
        score,
      });
      
      if (valid) {
        await storage.updateEnforcementSession(sessionId, { status: 'UNLOCKED' });
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
      
      // Simple text validation - in real app this would use NLP
      const valid = text && text.length > 20;
      const score = valid ? 90 : 0;
      
      const proof = await storage.createProof({
        sessionId,
        method: 'checkin',
        result: { text, valid },
        score,
      });
      
      if (valid) {
        await storage.updateEnforcementSession(sessionId, { status: 'UNLOCKED' });
      }
      
      res.json({ valid, proof });
    } catch (error) {
      console.error("Error processing checkin proof:", error);
      res.status(500).json({ message: "Failed to process proof" });
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
