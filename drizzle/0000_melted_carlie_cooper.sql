CREATE TABLE `findings` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`url` text NOT NULL,
	`referring_url` text,
	`title` text NOT NULL,
	`severity` text NOT NULL,
	`category` text NOT NULL,
	`evidence` text NOT NULL,
	`recommendation` text,
	`screenshot_url` text,
	`status_code` integer,
	`found_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_findings_lead_severity` ON `findings` (`lead_id`,`severity`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`dedupe_key` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`payload_json` text NOT NULL,
	`result_json` text,
	`attempts` integer DEFAULT 0 NOT NULL,
	`run_after` text DEFAULT (datetime('now')) NOT NULL,
	`lease_until` text,
	`last_error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_jobs_dedupe_key` ON `jobs` (`dedupe_key`);--> statement-breakpoint
CREATE INDEX `idx_jobs_ready` ON `jobs` (`status`,`run_after`,`lease_until`);--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`store_url` text,
	`contact_name` text,
	`contact_email` text,
	`contact_channel` text DEFAULT 'source-platform' NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text NOT NULL,
	`source_excerpt` text,
	`explicit_intent` integer DEFAULT false NOT NULL,
	`fit_score` integer DEFAULT 0 NOT NULL,
	`fit_reason` text,
	`proof_url` text,
	`proof_summary` text,
	`status` text DEFAULT 'discovered' NOT NULL,
	`next_action` text,
	`last_contact_at` text,
	`last_reply_at` text,
	`booked_at` text,
	`paid_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_leads_source_url` ON `leads` (`source_url`);--> statement-breakpoint
CREATE INDEX `idx_leads_status_updated` ON `leads` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_leads_contact_email` ON `leads` (`contact_email`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`external_id` text,
	`direction` text NOT NULL,
	`channel` text NOT NULL,
	`subject` text,
	`body_excerpt` text,
	`classification` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_messages_external_id` ON `messages` (`external_id`);--> statement-breakpoint
CREATE INDEX `idx_messages_lead_created` ON `messages` (`lead_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `suppression` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`reason` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_suppression_identifier` ON `suppression` (`identifier`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`external_id` text NOT NULL,
	`event_type` text NOT NULL,
	`received_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_webhook_provider_external` ON `webhook_events` (`provider`,`external_id`);
--> statement-breakpoint
PRAGMA optimize;
