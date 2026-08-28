CREATE TABLE `audit_pages` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`url` text NOT NULL,
	`status_code` integer,
	`page_title` text,
	`screenshot_url` text,
	`captured_at` text,
	`recorded_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_audit_pages_lead_url` ON `audit_pages` (`lead_id`,`url`);--> statement-breakpoint
CREATE INDEX `idx_audit_pages_lead_recorded` ON `audit_pages` (`lead_id`,`recorded_at`);