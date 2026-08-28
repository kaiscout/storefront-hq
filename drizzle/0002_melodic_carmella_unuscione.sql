CREATE UNIQUE INDEX `idx_findings_dedupe` ON `findings` (`lead_id`,`url`,`title`,`evidence`);--> statement-breakpoint
PRAGMA optimize;
