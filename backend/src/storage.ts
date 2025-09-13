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
  
  // Task methods
  getTasksByUser(userId: string, range?: string): Promise<Task[]>;
  createTask(insertTask: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string, userId: string): Promise<boolean>;
  
  // Enforcement session methods
  createEnforcementSession(insertSession: InsertEnforcementSession): Promise<EnforcementSession>;
  updateEnforcementSession(id: string, updates: Partial<EnforcementSession>): Promise<EnforcementSession | undefined>;
  
  // Proof methods
  createProof(insertProof: InsertProof): Promise<Proof>;
  
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

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
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
    return result.rowCount > 0;
  }

  async createEnforcementSession(insertSession: InsertEnforcementSession): Promise<EnforcementSession> {
    const [session] = await db
      .insert(enforcementSessions)
      .values(insertSession)
      .returning();
    return session;
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

  async getUserStats(userId: string): Promise<any> {
    // Get basic task statistics
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId));

    const totalTasks = userTasks.length;
    const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = userTasks.filter(t => t.status === 'PENDING').length;

    // Calculate current streak (simplified - in real app would be more sophisticated)
    const streak = 7; // Mock data

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
    
    return {
      ...stats,
      currentStreak: stats.streak,
      longestStreak: stats.streak + 3, // Mock data
      weeklyData: [
        { day: "Mon", completed: 4, total: 5 },
        { day: "Tue", completed: 3, total: 5 },
        { day: "Wed", completed: 5, total: 5 },
        { day: "Thu", completed: 4, total: 6 },
        { day: "Fri", completed: 6, total: 6 },
        { day: "Sat", completed: 2, total: 5 },
        { day: "Sun", completed: 1, total: 3 },
      ],
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
