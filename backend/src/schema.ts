import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const strictLevelEnum = pgEnum('strict_level', ['SOFT', 'MEDIUM', 'HARD']);
export const taskStatusEnum = pgEnum('task_status', ['PENDING', 'ACTIVE', 'COMPLETED', 'FAILED']);
export const sessionStatusEnum = pgEnum('session_status', ['PENDING', 'LOCKED', 'PROOF_REQUIRED', 'UNLOCKED', 'FAILED']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  strictModeEnabled: boolean("strict_mode_enabled").notNull().default(true),
  uninstallProtectionEnabled: boolean("uninstall_protection_enabled").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text("title").notNull(),
  startAt: text("start_at").notNull(), // ISO string
  endAt: text("end_at").notNull(), // ISO string
  durationMinutes: integer("duration_minutes").notNull(),
  strictLevel: strictLevelEnum("strict_level").notNull().default('MEDIUM'),
  targetApps: jsonb("target_apps").notNull().default([]), // string array
  proofMethods: jsonb("proof_methods").notNull().default(['screenshot']), // string array
  pdfFileUrl: text("pdf_file_url"), // for PDF tasks
  status: taskStatusEnum("status").notNull().default('PENDING'),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Enforcement Sessions table
export const enforcementSessions = pgTable("enforcement_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  deviceId: text("device_id").notNull(),
  status: sessionStatusEnum("status").notNull().default('PENDING'),
  startedAt: timestamp("started_at").default(sql`now()`),
  endedAt: timestamp("ended_at"),
  unlockedAt: timestamp("unlocked_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Proofs table
export const proofs = pgTable("proofs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => enforcementSessions.id, { onDelete: 'cascade' }),
  method: text("method").notNull(), // 'screenshot', 'quiz', 'checkin'
  result: jsonb("result").notNull(), // validation result data
  score: integer("score").notNull().default(0),
  fileUrl: text("file_url"), // for screenshot proofs
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Usage logs table (for tracking app usage during sessions)
export const usageLogs = pgTable("usage_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => enforcementSessions.id, { onDelete: 'cascade' }),
  packageName: text("package_name").notNull(),
  msInForeground: integer("ms_in_foreground").notNull().default(0),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

// Accountability partners table
export const accountabilityPartners = pgTable("accountability_partners", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  partnerUserId: varchar("partner_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'rejected'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  tasks: many(tasks),
  enforcementSessions: many(enforcementSessions),
  accountabilityPartners: many(accountabilityPartners, { relationName: 'user' }),
  partnerRelations: many(accountabilityPartners, { relationName: 'partner' }),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  enforcementSessions: many(enforcementSessions),
}));

export const enforcementSessionsRelations = relations(enforcementSessions, ({ one, many }) => ({
  task: one(tasks, {
    fields: [enforcementSessions.taskId],
    references: [tasks.id],
  }),
  user: one(users, {
    fields: [enforcementSessions.userId],
    references: [users.id],
  }),
  proofs: many(proofs),
  usageLogs: many(usageLogs),
}));

export const proofsRelations = relations(proofs, ({ one }) => ({
  session: one(enforcementSessions, {
    fields: [proofs.sessionId],
    references: [enforcementSessions.id],
  }),
}));

export const usageLogsRelations = relations(usageLogs, ({ one }) => ({
  session: one(enforcementSessions, {
    fields: [usageLogs.sessionId],
    references: [enforcementSessions.id],
  }),
}));

export const accountabilityPartnersRelations = relations(accountabilityPartners, ({ one }) => ({
  user: one(users, {
    fields: [accountabilityPartners.userId],
    references: [users.id],
    relationName: 'user',
  }),
  partner: one(users, {
    fields: [accountabilityPartners.partnerUserId],
    references: [users.id],
    relationName: 'partner',
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

export type EnforcementSession = typeof enforcementSessions.$inferSelect;
export type InsertEnforcementSession = typeof enforcementSessions.$inferInsert;

export type Proof = typeof proofs.$inferSelect;
export type InsertProof = typeof proofs.$inferInsert;

export type UsageLog = typeof usageLogs.$inferSelect;
export type InsertUsageLog = typeof usageLogs.$inferInsert;

export type AccountabilityPartner = typeof accountabilityPartners.$inferSelect;
export type InsertAccountabilityPartner = typeof accountabilityPartners.$inferInsert;
