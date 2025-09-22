CREATE TYPE "public"."session_status" AS ENUM('PENDING', 'LOCKED', 'PROOF_REQUIRED', 'UNLOCKED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."strict_level" AS ENUM('SOFT', 'MEDIUM', 'HARD');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('PENDING', 'ACTIVE', 'COMPLETED', 'FAILED');--> statement-breakpoint
CREATE TABLE "accountability_partners" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"partner_user_id" varchar NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" varchar NOT NULL,
	"external_event_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"is_all_day" boolean DEFAULT false NOT NULL,
	"location" text,
	"attendees" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"token_expiry" timestamp,
	"calendar_id" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"last_sync_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "enforcement_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"device_id" text NOT NULL,
	"status" "session_status" DEFAULT 'PENDING' NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"unlocked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proofs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"method" text NOT NULL,
	"result" jsonb NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"file_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"start_at" text NOT NULL,
	"end_at" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"strict_level" "strict_level" DEFAULT 'MEDIUM' NOT NULL,
	"target_apps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"proof_methods" jsonb DEFAULT '["screenshot"]'::jsonb NOT NULL,
	"pdf_file_url" text,
	"status" "task_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usage_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"package_name" text NOT NULL,
	"ms_in_foreground" integer DEFAULT 0 NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"name" text NOT NULL,
	"strict_mode_enabled" boolean DEFAULT true NOT NULL,
	"uninstall_protection_enabled" boolean DEFAULT false NOT NULL,
	"notification_task_reminders" boolean DEFAULT true NOT NULL,
	"notification_streak_updates" boolean DEFAULT true NOT NULL,
	"notification_accountability_alerts" boolean DEFAULT false NOT NULL,
	"fcm_token" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "accountability_partners" ADD CONSTRAINT "accountability_partners_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accountability_partners" ADD CONSTRAINT "accountability_partners_partner_user_id_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_integration_id_calendar_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."calendar_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enforcement_sessions" ADD CONSTRAINT "enforcement_sessions_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enforcement_sessions" ADD CONSTRAINT "enforcement_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proofs" ADD CONSTRAINT "proofs_session_id_enforcement_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."enforcement_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_session_id_enforcement_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."enforcement_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "calendar_events_integration_id_idx" ON "calendar_events" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "calendar_events_external_id_idx" ON "calendar_events" USING btree ("external_event_id");--> statement-breakpoint
CREATE INDEX "calendar_events_start_time_idx" ON "calendar_events" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "enforcement_sessions_user_id_idx" ON "enforcement_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "enforcement_sessions_task_id_idx" ON "enforcement_sessions" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "enforcement_sessions_status_idx" ON "enforcement_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "proofs_session_id_idx" ON "proofs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "tasks_user_id_idx" ON "tasks" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "tasks_start_at_idx" ON "tasks" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX "tasks_end_at_idx" ON "tasks" USING btree ("end_at");--> statement-breakpoint
CREATE INDEX "tasks_user_status_idx" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_user_start_at_idx" ON "tasks" USING btree ("user_id","start_at");