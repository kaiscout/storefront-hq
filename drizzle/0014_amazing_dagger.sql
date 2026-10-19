CREATE TABLE IF NOT EXISTS `commerce_subscriptions` (
	`subscription_id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`checkout_session_id` text NOT NULL,
	`customer_id` text,
	`customer_email` text,
	`status` text NOT NULL,
	`current_period_start` integer,
	`current_period_end` integer,
	`cancel_at_period_end` integer DEFAULT false NOT NULL,
	`latest_invoice_id` text,
	`last_event_id` text NOT NULL,
	`last_event_created` integer NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_commerce_subscriptions_session` ON `commerce_subscriptions` (`checkout_session_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_commerce_subscriptions_status` ON `commerce_subscriptions` (`status`,`updated_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_commerce_subscriptions_email` ON `commerce_subscriptions` (`customer_email`,`updated_at`);--> statement-breakpoint
CREATE TABLE `website_form_limits` (
	`identifier` text PRIMARY KEY NOT NULL,
	`window_started_at` integer NOT NULL,
	`attempts` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `website_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`fingerprint` text NOT NULL,
	`kind` text NOT NULL,
	`contact_name` text NOT NULL,
	`contact_email` text NOT NULL,
	`company` text,
	`store_url` text,
	`topic` text NOT NULL,
	`product_id` text,
	`message` text NOT NULL,
	`rating` integer,
	`display_name` text,
	`publish_consent` integer DEFAULT 0 NOT NULL,
	`moderation_status` text DEFAULT 'pending' NOT NULL,
	`notification_state` text DEFAULT 'queued' NOT NULL,
	`notification_claim` text,
	`notification_claimed_at` text,
	`notification_message_id` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_website_submissions_notification` ON `website_submissions` (`notification_state`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_website_submissions_reviews` ON `website_submissions` (`kind`,`moderation_status`,`created_at`);
