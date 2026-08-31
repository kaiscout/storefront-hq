CREATE TABLE `cal_bookings` (
	`booking_uid` text PRIMARY KEY NOT NULL,
	`attendee_email` text,
	`status` text NOT NULL,
	`lead_id` text,
	`last_event_id` text NOT NULL,
	`last_event_type` text NOT NULL,
	`starts_at` text,
	`ends_at` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_cal_bookings_status_updated` ON `cal_bookings` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `intake_rate_limits` (
	`identifier` text PRIMARY KEY NOT NULL,
	`window_started_at` text DEFAULT (datetime('now')) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_intake_rate_limits_updated` ON `intake_rate_limits` (`updated_at`);--> statement-breakpoint
ALTER TABLE `leads` ADD `contact_permission` text DEFAULT 'none' NOT NULL;