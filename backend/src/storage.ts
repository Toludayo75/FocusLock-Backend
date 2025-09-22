import session from "express-session";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db.js";
import { users, tasks, enforcementSessions, proofs, calendarIntegrations, calendarEvents, accountabilityPartners, type User, type InsertUser, type Task, type InsertTask, type EnforcementSession, type InsertEnforcementSession, type Proof, type InsertProof, type CalendarIntegration, type InsertCalendarIntegration, type CalendarEvent, type InsertCalendarEvent, type AccountabilityPartner, type InsertAccountabilityPartner } from "./schema.js";
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
  
  // Calendar integration methods
  createCalendarIntegration(insertIntegration: InsertCalendarIntegration): Promise<CalendarIntegration>;
  getCalendarIntegrations(userId: string): Promise<CalendarIntegration[]>;
  updateCalendarIntegration(id: string, updates: Partial<CalendarIntegration>): Promise<CalendarIntegration | undefined>;
  deleteCalendarIntegration(id: string, userId: string): Promise<boolean>;
  
  // Calendar events methods
  createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent>;
  getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]>;
  syncCalendarEvents(integrationId: string, events: InsertCalendarEvent[]): Promise<CalendarEvent[]>;
  
  // Accountability partners methods
  getAccountabilityPartners(userId: string): Promise<AccountabilityPartner[]>;
  addAccountabilityPartner(userId: string, partnerEmail: string): Promise<AccountabilityPartner>;
  updateAccountabilityPartnerStatus(id: string, status: 'accepted' | 'rejected'): Promise<AccountabilityPartner | undefined>;
  removeAccountabilityPartner(id: string, userId: string): Promise<boolean>;
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
      longestStreak: await this.calculateLongestStreak(userId, stats.streak),
      weeklyData,
      achievements: await this.calculateAchievements(userId, stats, weeklyData)
    };
  }

  private async calculateAchievements(userId: string, stats: any, weeklyData: any[]): Promise<any[]> {
    const achievements: any[] = [];
    
    // First Task Achievement - earned when user completes their first task
    if (stats.completedTasks >= 1) {
      achievements.push({
        id: "first-task",
        title: "First Task",
        description: "Completed your first enforced task",
        dateEarned: "Recently",
        icon: "target"
      });
    }
    
    // 7-Day Streak Achievement - earned when user has current streak of 7+ days
    if (stats.streak >= 7) {
      achievements.push({
        id: "7-day-streak",
        title: "7-Day Streak", 
        description: "Completed tasks for 7 consecutive days",
        dateEarned: "Recently",
        icon: "fire"
      });
    }
    
    // Perfect Week Achievement - earned when user has 100% completion for the week
    const weeklyCompleted = weeklyData.reduce((sum, day) => sum + day.completed, 0);
    const weeklyTotal = weeklyData.reduce((sum, day) => sum + day.total, 0);
    
    if (weeklyTotal > 0 && weeklyCompleted === weeklyTotal) {
      achievements.push({
        id: "perfect-week",
        title: "Perfect Week",
        description: "100% completion rate for a full week",
        dateEarned: "This week",
        icon: "trophy"
      });
    }
    
    // High Achiever - earned when user completes 10+ tasks
    if (stats.completedTasks >= 10) {
      achievements.push({
        id: "high-achiever",
        title: "High Achiever",
        description: "Completed 10 or more tasks",
        dateEarned: "Recently",
        icon: "trophy"
      });
    }
    
    return achievements;
  }

  private async calculateLongestStreak(userId: string, currentStreak: number): Promise<number> {
    // Since we don't have historical streak data, implement a reasonable heuristic
    // based on the user's overall task completion patterns
    
    const userTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.userId, userId));
    
    const completedTasks = userTasks.filter(t => t.status === 'COMPLETED').length;
    const totalTasks = userTasks.length;
    
    // If user has good completion rate and current streak, estimate a reasonable longest streak
    if (totalTasks === 0) return 0;
    
    const completionRate = completedTasks / totalTasks;
    
    // Heuristic: longest streak is at least current streak, 
    // and could be higher based on completion patterns
    let longestStreak = currentStreak;
    
    // If user has high completion rate (>80%), they likely had longer streaks
    if (completionRate >= 0.8 && completedTasks >= 5) {
      longestStreak = Math.max(currentStreak, Math.min(14, Math.floor(completedTasks * 0.4)));
    }
    // If user has moderate completion rate (>50%), modest boost
    else if (completionRate >= 0.5 && completedTasks >= 3) {
      longestStreak = Math.max(currentStreak, Math.min(10, Math.floor(completedTasks * 0.3)));
    }
    
    return longestStreak;
  }

  // Calendar integration methods
  async createCalendarIntegration(insertIntegration: InsertCalendarIntegration): Promise<CalendarIntegration> {
    const [integration] = await db
      .insert(calendarIntegrations)
      .values(insertIntegration)
      .returning();
    return integration;
  }

  async getCalendarIntegrations(userId: string): Promise<CalendarIntegration[]> {
    return await db
      .select()
      .from(calendarIntegrations)
      .where(eq(calendarIntegrations.userId, userId));
  }

  async updateCalendarIntegration(id: string, updates: Partial<CalendarIntegration>): Promise<CalendarIntegration | undefined> {
    const [integration] = await db
      .update(calendarIntegrations)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(calendarIntegrations.id, id))
      .returning();
    return integration || undefined;
  }

  async deleteCalendarIntegration(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(calendarIntegrations)
      .where(and(
        eq(calendarIntegrations.id, id),
        eq(calendarIntegrations.userId, userId)
      ));
    return (result.rowCount ?? 0) > 0;
  }

  // Calendar events methods
  async createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await db
      .insert(calendarEvents)
      .values(insertEvent)
      .returning();
    return event;
  }

  async getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
    let whereConditions = [eq(calendarIntegrations.userId, userId)];

    if (startDate && endDate) {
      whereConditions.push(
        gte(calendarEvents.startTime, startDate),
        lte(calendarEvents.endTime, endDate)
      );
    }

    const results = await db
      .select()
      .from(calendarEvents)
      .innerJoin(calendarIntegrations, eq(calendarEvents.integrationId, calendarIntegrations.id))
      .where(and(...whereConditions));

    return results.map(result => result.calendar_events);
  }

  async syncCalendarEvents(integrationId: string, events: InsertCalendarEvent[]): Promise<CalendarEvent[]> {
    // Delete existing events for this integration
    await db
      .delete(calendarEvents)
      .where(eq(calendarEvents.integrationId, integrationId));

    // Insert new events
    if (events.length === 0) return [];
    
    const insertedEvents = await db
      .insert(calendarEvents)
      .values(events)
      .returning();
    
    return insertedEvents;
  }

  // Accountability partners methods
  async getAccountabilityPartners(userId: string): Promise<AccountabilityPartner[]> {
    return await db
      .select()
      .from(accountabilityPartners)
      .where(eq(accountabilityPartners.userId, userId));
  }

  async addAccountabilityPartner(userId: string, partnerEmail: string): Promise<AccountabilityPartner> {
    // Find the partner user by email
    const partnerUser = await this.getUserByEmail(partnerEmail);
    if (!partnerUser) {
      throw new Error('User with this email not found');
    }

    // Check if partnership already exists
    const [existingPartnership] = await db
      .select()
      .from(accountabilityPartners)
      .where(and(
        eq(accountabilityPartners.userId, userId),
        eq(accountabilityPartners.partnerUserId, partnerUser.id)
      ));

    if (existingPartnership) {
      throw new Error('Partnership already exists');
    }

    const [partnership] = await db
      .insert(accountabilityPartners)
      .values({
        userId,
        partnerUserId: partnerUser.id,
        status: 'pending'
      })
      .returning();
    
    return partnership;
  }

  async updateAccountabilityPartnerStatus(id: string, status: 'accepted' | 'rejected'): Promise<AccountabilityPartner | undefined> {
    const [partnership] = await db
      .update(accountabilityPartners)
      .set({ status })
      .where(eq(accountabilityPartners.id, id))
      .returning();
    return partnership || undefined;
  }

  async removeAccountabilityPartner(id: string, userId: string): Promise<boolean> {
    const result = await db
      .delete(accountabilityPartners)
      .where(and(
        eq(accountabilityPartners.id, id),
        eq(accountabilityPartners.userId, userId)
      ));
    return (result.rowCount ?? 0) > 0;
  }
}

export const storage = new DatabaseStorage();
