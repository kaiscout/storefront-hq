ALTER TABLE `firecrawl_spend` ADD `settled_units` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `firecrawl_spend` ADD `external_id` text;--> statement-breakpoint
ALTER TABLE `firecrawl_spend` ADD `retry_released` integer DEFAULT 0 NOT NULL;