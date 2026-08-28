CREATE TABLE `stripe_checkout_sessions` (
	`session_id` text PRIMARY KEY NOT NULL,
	`outcome` text NOT NULL,
	`outcome_rank` integer NOT NULL,
	`event_created` integer NOT NULL,
	`event_id` text NOT NULL,
	`lead_id` text,
	`amount_total` integer,
	`currency` text,
	`payment_status` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stripe_checkout_outcome` ON `stripe_checkout_sessions` (`outcome`,`updated_at`);