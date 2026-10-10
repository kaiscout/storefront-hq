CREATE TABLE IF NOT EXISTS `commerce_orders` (
	`session_id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`outcome` text NOT NULL,
	`outcome_rank` integer NOT NULL,
	`event_created` integer NOT NULL,
	`event_id` text NOT NULL,
	`lead_id` text,
	`customer_email` text,
	`amount_total` integer,
	`currency` text,
	`payment_status` text,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_commerce_orders_outcome` ON `commerce_orders` (`outcome`,`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_commerce_orders_email` ON `commerce_orders` (`customer_email`,`updated_at`);
