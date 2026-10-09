DROP TABLE `power_settings`;--> statement-breakpoint
ALTER TABLE `power_circuits` ADD `mode` enum('mono','tetra') DEFAULT 'tetra' NOT NULL;