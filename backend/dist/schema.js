import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, pgEnum, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
// Enums
export const strictLevelEnum = pgEnum('strict_level', ['SOFT', 'MEDIUM', 'HARD']);
export const taskStatusEnum = pgEnum('task_status', ['PENDING', 'ACTIVE', 'COMPLETED', 'FAILED']);
export const sessionStatusEnum = pgEnum('session_status', ['PENDING', 'LOCKED', 'PROOF_REQUIRED', 'UNLOCKED', 'FAILED']);
// Users table
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    name: text("name").notNull(),
    strictModeEnabled: boolean("strict_mode_enabled").notNull().default(true),
    uninstallProtectionEnabled: boolean("uninstall_protection_enabled").notNull().default(false),
    notificationTaskReminders: boolean("notification_task_reminders").notNull().default(true),
    notificationStreakUpdates: boolean("notification_streak_updates").notNull().default(true),
    notificationAccountabilityAlerts: boolean("notification_accountability_alerts").notNull().default(false),
    fcmToken: text("fcm_token"), // Firebase Cloud Messaging token for push notifications
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`),
});
// Tasks table
export const tasks = pgTable("tasks", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`),
}, (table) => {
    return {
        userIdIdx: index("tasks_user_id_idx").on(table.userId),
        statusIdx: index("tasks_status_idx").on(table.status),
        startAtIdx: index("tasks_start_at_idx").on(table.startAt),
        endAtIdx: index("tasks_end_at_idx").on(table.endAt),
        userStatusIdx: index("tasks_user_status_idx").on(table.userId, table.status),
        userStartAtIdx: index("tasks_user_start_at_idx").on(table.userId, table.startAt),
    };
});
// Enforcement Sessions table
export const enforcementSessions = pgTable("enforcement_sessions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    taskId: varchar("task_id").notNull().references(() => tasks.id, { onDelete: 'cascade' }),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    deviceId: text("device_id").notNull(),
    status: sessionStatusEnum("status").notNull().default('PENDING'),
    startedAt: timestamp("started_at").default(sql `now()`),
    endedAt: timestamp("ended_at"),
    unlockedAt: timestamp("unlocked_at"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`),
}, (table) => {
    return {
        userIdIdx: index("enforcement_sessions_user_id_idx").on(table.userId),
        taskIdIdx: index("enforcement_sessions_task_id_idx").on(table.taskId),
        statusIdx: index("enforcement_sessions_status_idx").on(table.status),
    };
});
// Proofs table
export const proofs = pgTable("proofs", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    sessionId: varchar("session_id").notNull().references(() => enforcementSessions.id, { onDelete: 'cascade' }),
    method: text("method").notNull(), // 'screenshot', 'quiz', 'checkin'
    result: jsonb("result").notNull(), // validation result data
    score: integer("score").notNull().default(0),
    fileUrl: text("file_url"), // for screenshot proofs
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
}, (table) => {
    return {
        sessionIdIdx: index("proofs_session_id_idx").on(table.sessionId),
    };
});
// Usage logs table (for tracking app usage during sessions)
export const usageLogs = pgTable("usage_logs", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    sessionId: varchar("session_id").notNull().references(() => enforcementSessions.id, { onDelete: 'cascade' }),
    packageName: text("package_name").notNull(),
    msInForeground: integer("ms_in_foreground").notNull().default(0),
    timestamp: timestamp("timestamp").notNull().default(sql `now()`),
});
// Accountability partners table
export const accountabilityPartners = pgTable("accountability_partners", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    partnerUserId: varchar("partner_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text("status").notNull().default('pending'), // 'pending', 'accepted', 'rejected'
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
// Calendar integrations table
export const calendarIntegrations = pgTable("calendar_integrations", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
    provider: text("provider").notNull(), // 'outlook', 'google', 'apple'
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiry: timestamp("token_expiry"),
    calendarId: text("calendar_id"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    lastSyncAt: timestamp("last_sync_at"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`),
});
// Calendar events table (synced from external calendars)
export const calendarEvents = pgTable("calendar_events", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    integrationId: varchar("integration_id").notNull().references(() => calendarIntegrations.id, { onDelete: 'cascade' }),
    externalEventId: text("external_event_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startTime: text("start_time").notNull(), // ISO string
    endTime: text("end_time").notNull(), // ISO string
    isAllDay: boolean("is_all_day").notNull().default(false),
    location: text("location"),
    attendees: jsonb("attendees").default([]),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`),
}, (table) => {
    return {
        integrationIdIdx: index("calendar_events_integration_id_idx").on(table.integrationId),
        externalEventIdIdx: index("calendar_events_external_id_idx").on(table.externalEventId),
        startTimeIdx: index("calendar_events_start_time_idx").on(table.startTime),
    };
});
// Relations
export const usersRelations = relations(users, ({ many }) => ({
    tasks: many(tasks),
    enforcementSessions: many(enforcementSessions),
    accountabilityPartners: many(accountabilityPartners, { relationName: 'user' }),
    partnerRelations: many(accountabilityPartners, { relationName: 'partner' }),
    calendarIntegrations: many(calendarIntegrations),
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
export const calendarIntegrationsRelations = relations(calendarIntegrations, ({ one, many }) => ({
    user: one(users, {
        fields: [calendarIntegrations.userId],
        references: [users.id],
    }),
    events: many(calendarEvents),
}));
export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
    integration: one(calendarIntegrations, {
        fields: [calendarEvents.integrationId],
        references: [calendarIntegrations.id],
    }),
}));
//# sourceMappingURL=schema.js.map