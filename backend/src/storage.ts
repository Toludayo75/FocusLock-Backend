import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db.js";
import { users, tasks, enforcementSessions, proofs, type User, type InsertUser, type Task, type InsertTask, type EnforcementSession, type InsertEnforcementSession, type Proof, type InsertProof } from "./schema.js";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { startOfDay, endOfDay, startOfWeek, endOfWeek } from "date-fns";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(insertUser: InsertUser): Promise<User>;
  updateUserFcmToken(userId: string, fcmToken: string | null): Promise<User | undefined>;
  updateUserProfile(userId: string, updates: { name?: string; email?: string }): Promise<User | undefined>;
  updateUserSettings(userId: string, updates: { 
    strictModeEnabled?: boolean; 
    uninstallProtectionEnabled?: boolean;
    notificationTaskReminders?: boolean;
    notificationStreakUpdates?: boolean;
    notificationAccountabilityAlerts?: boolean;
  }): Promise<User | undefined>;
  
  // Task methods
  getTasksByUser(userId: string, range?: string): Promise<Task[]>;
  getActiveTasksByUser(userId: string): Promise<Task[]>;
  createTask(insertTask: InsertTask): Promise<Task>;
  getTask(id: string): Promise<Task | undefined>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string, userId: string): Promise<boolean>;
  getPendingTasksDueToStart(): Promise<Task[]>;
  getActiveTasksDueToStop(): Promise<Task[]>;
  
  // Enforcement session methods
  createEnforcementSession(insertSession: InsertEnforcementSession): Promise<EnforcementSession>;
  getEnforcementSession(id: string): Promise<EnforcementSession | undefined>;
  updateEnforcementSession(id: string, updates: Partial<EnforcementSession>): Promise<EnforcementSession | undefined>;
  
  // Proof methods
  createProof(insertProof: InsertProof): Promise<Proof>;
  createProofAndUpdateSession(insertProof: InsertProof, sessionId: string, sessionUpdates: Partial<EnforcementSession>): Promise<{ proof: Proof; session: EnforcementSession }>;
  
  // Stats methods
  getUserStats(userId: string): Promise<any>;
  getProgressStats(userId: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserFcmToken(userId: string, fcmToken: string | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ fcmToken })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateUserProfile(userId: string, updates: { name?: string; email?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        ...(updates.name && { name: updates.name }),
        ...(updates.email && { email: updates.email }),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async updateUserSettings(userId: string, updates: { 
    strictModeEnabled?: boolean; 
    uninstallProtectionEnabled?: boolean;
    notificationTaskReminders?: boolean;
    notificationStreakUpdates?: boolean;
    notificationAccountabilityAlerts?: boolean;
  }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ 
        ...(updates.strictModeEnabled !== undefined && { strictModeEnabled: updates.strictModeEnabled }),
        ...(updates.uninstallProtectionEnabled !== undefined && { uninstallProtectionEnabled: updates.uninstallProtectionEnabled }),
        ...(updates.notificationTaskReminders !== undefined && { notificationTaskReminders: updates.notificationTaskReminders }),
        ...(updates.notificationStreakUpdates !== undefined && { notificationStreakUpdates: updates.notificationStreakUpdates }),
        ...(updates.notificationAccountabilityAlerts !== undefined && { notificationAccountabilityAlerts: updates.notificationAccountabilityAlerts }),
        updatedAt: new Date()
      })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getTasksByUser(userId: string, range?: string): Promise<Task[]> {
    let whereCondition = eq(tasks.userId, userId);
    
    if (range === 'today') {
      const today = new Date();
      const start = startOfDay(today);
      const end = endOfDay(today);
      whereCondition = and(
        eq(tasks.userId, userId),
        gte(tasks.startAt, start.toISOString()),
        lte(tasks.startAt, end.toISOString())
      ) as any;
    } else if (range === 'week') {
      const today = new Date();
      const start = startOfWeek(today);
      const end = endOfWeek(today);
      whereCondition = and(
        eq(tasks.userId, userId),
        gte(tasks.startAt, start.toISOString()),
        lte(tasks.startAt, end.toISOString())
      ) as any;
    }

    return await db
      .select()
      .from(tasks)
      .where(whereCondition)
      .orderBy(desc(tasks.startAt));
  }

  async getActiveTasksByUser(userId: string): Promise<Task[]> {
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.userId, userId),
        eq(tasks.status, 'ACTIVE')
      ))
      .orderBy(desc(tasks.startAt));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async getTask(id: string): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db
      .update(tasks)
      .set(updates)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
    return (result.rowCount || 0) > 0;
  }

  async getPendingTasksDueToStart(): Promise<Task[]> {
    const now = new Date().toISOString();
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.status, 'PENDING'),
        lte(tasks.startAt, now)
      ));
  }

  async getActiveTasksDueToStop(): Promise<Task[]> {
    const now = new Date().toISOString();
    return await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.status, 'ACTIVE'),
        lte(tasks.endAt, now)
      ));
  }

  async createEnforcementSession(insertSession: InsertEnforcementSession): Promise<EnforcementSession> {
    const [session] = await db
      .insert(enforcementSessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async getEnforcementSession(id: string): Promise<EnforcementSession | undefined> {
    const [session] = await db.select().from(enforcementSessions).where(eq(enforcementSessions.id, id));
    return session || undefined;
  }

  async updateEnforcementSession(id: string, updates: Partial<EnforcementSession>): Promise<EnforcementSession | undefined> {
    const [session] = await db
      .update(enforcementSessions)
      .set(updates)
      .where(eq(enforcementSessions.id, id))
      .returning();
    return session || undefined;
  }

  async createProof(insertProof: InsertProof): Promise<Proof> {
    const [proof] = await db
      .insert(proofs)
      .values(insertProof)
      .returning();
    return proof;
  }

  async createProofAndUpdateSession(insertProof: InsertProof, sessionId: string, sessionUpdates: Partial<EnforcementSession>): Promise<{ proof: Proof; session: EnforcementSession }> {
    return await db.transaction(async (tx) => {
      // Create the proof
      const [proof] = await tx
        .insert(proofs)
        .values(insertProof)
        .returning();
      
      // Update the enforcement session
      const [session] = await tx
        .update(enforcementSessions)
        .set(sessionUpdates)
        .where(eq(enforcementSessions.id, sessionId))
        .returning();
      
      if (!session) {
        throw new Error("Session not found during update");
      }
      
      return { proof, session };
    });
  }

  async getUserStats(userId: string): Promise<any> {
    // Get basic task statistics
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId));

    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = userTasks.filter(t => t.status === 'PENDING').length;

    // Calculate current streak based on actual task completion
    let streak = 0;
    if (completedTasks > 0) {
      // For now, calculate a simple streak based on completion rate
      // In a real app, this would check consecutive days of task completion
      const recentCompletionRate = completedTasks / Math.max(totalTasks, 1);
      streak = Math.floor(recentCompletionRate * 10); // Simple calculation
    }

    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      streak,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
    };
  }

  async getProgressStats(userId: string): Promise<any> {
    const stats = await this.getUserStats(userId);
    
    // Get real weekly data from tasks
    const weeklyTasks = await this.getTasksByUser(userId, 'week');
    
    // Group tasks by day of week and calculate stats
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyData = dayNames.map(day => ({ day, completed: 0, total: 0 }));
    
    weeklyTasks.forEach(task => {
      const taskDate = new Date(task.startAt);
      const dayIndex = taskDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const dayData = weeklyData[dayIndex];
      
      dayData.total++;
      if (task.status === 'COMPLETED') {
        dayData.completed++;
      }
    });
    
    return {
      ...stats,
      currentStreak: stats.streak,
      longestStreak: stats.streak + 3, // Mock data - will be fixed in task 4
      weeklyData,
      achievements: [
        {
          id: "1",
          title: "7-Day Streak",
          description: "Completed tasks for 7 consecutive days",
          dateEarned: "2 days ago",
          icon: "fire"
        },
        {
          id: "2",
          title: "First Task",
          description: "Completed your first enforced task",
          dateEarned: "1 week ago",
          icon: "target"
        }
      ]
    };
  }
}

export const storage = new DatabaseStorage();
