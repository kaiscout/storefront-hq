CREATE TABLE `route_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`url` text NOT NULL,
	`content_hash` text NOT NULL,
	`status_code` integer,
	`page_title` text,
	`checked_at` text DEFAULT (datetime('now')) NOT NULL,
	`changed_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`lead_id`) REFERENCES `leads`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_route_snapshots_lead_url` ON `route_snapshots` (`lead_id`,`url`);--> statement-breakpoint
CREATE INDEX `idx_route_snapshots_checked` ON `route_snapshots` (`lead_id`,`checked_at`);--> statement-breakpoint
PRAGMA optimize;
