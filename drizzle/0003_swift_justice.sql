CREATE TABLE `watch_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`url` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_watch_routes_lead_url` ON `watch_routes` (`lead_id`,`url`);--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `status` text DEFAULT 'processed' NOT NULL;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `lease_until` text;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `processed_at` text;--> statement-breakpoint
ALTER TABLE `webhook_events` ADD `last_error` text;--> statement-breakpoint
PRAGMA optimize;
