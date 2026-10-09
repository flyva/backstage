CREATE TABLE `power_settings` (
	`project_id` int NOT NULL,
	`mode` enum('mono','tetra') NOT NULL DEFAULT 'tetra',
	`supply_amps` int NOT NULL DEFAULT 32,
	CONSTRAINT `power_settings_project_id` PRIMARY KEY(`project_id`)
);
--> statement-breakpoint
ALTER TABLE `power_settings` ADD CONSTRAINT `power_settings_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;