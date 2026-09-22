CREATE TABLE `firecrawl_credit_periods` (
	`period` text PRIMARY KEY NOT NULL,
	`ends_at` text NOT NULL,
	`allowance` integer NOT NULL,
	`remaining` integer NOT NULL,
	`checked_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `firecrawl_spend` (
	`id` text PRIMARY KEY NOT NULL,
	`period` text NOT NULL,
	`day` text NOT NULL,
	`request_key` text NOT NULL,
	`purpose` text NOT NULL,
	`units` integer NOT NULL,
	`reserved_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_firecrawl_spend_period` ON `firecrawl_spend` (`period`,`purpose`);--> statement-breakpoint
CREATE INDEX `idx_firecrawl_spend_day` ON `firecrawl_spend` (`day`,`purpose`);--> statement-breakpoint
CREATE INDEX `idx_firecrawl_spend_request` ON `firecrawl_spend` (`request_key`,`reserved_at`);