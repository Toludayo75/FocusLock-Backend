import session from "express-session";
import { type User, type InsertUser, type Task, type InsertTask, type EnforcementSession, type InsertEnforcementSession, type Proof, type InsertProof, type CalendarIntegration, type InsertCalendarIntegration, type CalendarEvent, type InsertCalendarEvent, type AccountabilityPartner } from "./schema.js";
export interface IStorage {
    sessionStore: session.Store;
    getUser(id: string): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    createUser(insertUser: InsertUser): Promise<User>;
    updateUserFcmToken(userId: string, fcmToken: string | null): Promise<User | undefined>;
    updateUserProfile(userId: string, updates: {
        name?: string;
        email?: string;
    }): Promise<User | undefined>;
    updateUserSettings(userId: string, updates: {
        strictModeEnabled?: boolean;
        uninstallProtectionEnabled?: boolean;
        notificationTaskReminders?: boolean;
        notificationStreakUpdates?: boolean;
        notificationAccountabilityAlerts?: boolean;
    }): Promise<User | undefined>;
    getTasksByUser(userId: string, range?: string): Promise<Task[]>;
    getActiveTasksByUser(userId: string): Promise<Task[]>;
    createTask(insertTask: InsertTask): Promise<Task>;
    getTask(id: string): Promise<Task | undefined>;
    updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
    deleteTask(id: string, userId: string): Promise<boolean>;
    getPendingTasksDueToStart(): Promise<Task[]>;
    getActiveTasksDueToStop(): Promise<Task[]>;
    createEnforcementSession(insertSession: InsertEnforcementSession): Promise<EnforcementSession>;
    getEnforcementSession(id: string): Promise<EnforcementSession | undefined>;
    updateEnforcementSession(id: string, updates: Partial<EnforcementSession>): Promise<EnforcementSession | undefined>;
    createProof(insertProof: InsertProof): Promise<Proof>;
    createProofAndUpdateSession(insertProof: InsertProof, sessionId: string, sessionUpdates: Partial<EnforcementSession>): Promise<{
        proof: Proof;
        session: EnforcementSession;
    }>;
    getUserStats(userId: string): Promise<any>;
    getProgressStats(userId: string): Promise<any>;
    createCalendarIntegration(insertIntegration: InsertCalendarIntegration): Promise<CalendarIntegration>;
    getCalendarIntegrations(userId: string): Promise<CalendarIntegration[]>;
    updateCalendarIntegration(id: string, updates: Partial<CalendarIntegration>): Promise<CalendarIntegration | undefined>;
    deleteCalendarIntegration(id: string, userId: string): Promise<boolean>;
    createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent>;
    getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]>;
    syncCalendarEvents(integrationId: string, events: InsertCalendarEvent[]): Promise<CalendarEvent[]>;
    getAccountabilityPartners(userId: string): Promise<AccountabilityPartner[]>;
    addAccountabilityPartner(userId: string, partnerEmail: string): Promise<AccountabilityPartner>;
    updateAccountabilityPartnerStatus(id: string, status: 'accepted' | 'rejected'): Promise<AccountabilityPartner | undefined>;
    removeAccountabilityPartner(id: string, userId: string): Promise<boolean>;
}
export declare class DatabaseStorage implements IStorage {
    sessionStore: session.Store;
    constructor();
    getUser(id: string): Promise<User | undefined>;
    getUserByEmail(email: string): Promise<User | undefined>;
    createUser(insertUser: InsertUser): Promise<User>;
    updateUserFcmToken(userId: string, fcmToken: string | null): Promise<User | undefined>;
    updateUserProfile(userId: string, updates: {
        name?: string;
        email?: string;
    }): Promise<User | undefined>;
    updateUserSettings(userId: string, updates: {
        strictModeEnabled?: boolean;
        uninstallProtectionEnabled?: boolean;
        notificationTaskReminders?: boolean;
        notificationStreakUpdates?: boolean;
        notificationAccountabilityAlerts?: boolean;
    }): Promise<User | undefined>;
    getTasksByUser(userId: string, range?: string): Promise<Task[]>;
    getActiveTasksByUser(userId: string): Promise<Task[]>;
    createTask(insertTask: InsertTask): Promise<Task>;
    getTask(id: string): Promise<Task | undefined>;
    updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
    deleteTask(id: string, userId: string): Promise<boolean>;
    getPendingTasksDueToStart(): Promise<Task[]>;
    getActiveTasksDueToStop(): Promise<Task[]>;
    createEnforcementSession(insertSession: InsertEnforcementSession): Promise<EnforcementSession>;
    getEnforcementSession(id: string): Promise<EnforcementSession | undefined>;
    updateEnforcementSession(id: string, updates: Partial<EnforcementSession>): Promise<EnforcementSession | undefined>;
    createProof(insertProof: InsertProof): Promise<Proof>;
    createProofAndUpdateSession(insertProof: InsertProof, sessionId: string, sessionUpdates: Partial<EnforcementSession>): Promise<{
        proof: Proof;
        session: EnforcementSession;
    }>;
    getUserStats(userId: string): Promise<any>;
    getProgressStats(userId: string): Promise<any>;
    private calculateAchievements;
    private calculateLongestStreak;
    createCalendarIntegration(insertIntegration: InsertCalendarIntegration): Promise<CalendarIntegration>;
    getCalendarIntegrations(userId: string): Promise<CalendarIntegration[]>;
    updateCalendarIntegration(id: string, updates: Partial<CalendarIntegration>): Promise<CalendarIntegration | undefined>;
    deleteCalendarIntegration(id: string, userId: string): Promise<boolean>;
    createCalendarEvent(insertEvent: InsertCalendarEvent): Promise<CalendarEvent>;
    getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]>;
    syncCalendarEvents(integrationId: string, events: InsertCalendarEvent[]): Promise<CalendarEvent[]>;
    getAccountabilityPartners(userId: string): Promise<AccountabilityPartner[]>;
    addAccountabilityPartner(userId: string, partnerEmail: string): Promise<AccountabilityPartner>;
    updateAccountabilityPartnerStatus(id: string, status: 'accepted' | 'rejected'): Promise<AccountabilityPartner | undefined>;
    removeAccountabilityPartner(id: string, userId: string): Promise<boolean>;
}
export declare const storage: DatabaseStorage;
//# sourceMappingURL=storage.d.ts.map