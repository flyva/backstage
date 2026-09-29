CREATE TABLE `project_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`file` varchar(60) NOT NULL,
	`original_name` varchar(200) NOT NULL,
	`mime` varchar(60) NOT NULL,
	`size` int NOT NULL,
	`uploaded_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `project_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tech_inputs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`channel` int NOT NULL,
	`source` varchar(100) NOT NULL,
	`mic` varchar(100),
	`stand` varchar(60),
	`phantom` boolean NOT NULL DEFAULT false,
	`notes` varchar(300),
	CONSTRAINT `tech_inputs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tech_lights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`channel` int,
	`label` varchar(120) NOT NULL,
	`mode` varchar(60),
	`universe` int NOT NULL DEFAULT 1,
	`address` int,
	`footprint` int NOT NULL DEFAULT 1,
	`position` varchar(100),
	`color` varchar(60),
	`notes` varchar(300),
	CONSTRAINT `tech_lights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `project_files` ADD CONSTRAINT `project_files_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_files` ADD CONSTRAINT `project_files_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tech_inputs` ADD CONSTRAINT `tech_inputs_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tech_lights` ADD CONSTRAINT `tech_lights_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pf_project_idx` ON `project_files` (`project_id`);--> statement-breakpoint
CREATE INDEX `ti_project_idx` ON `tech_inputs` (`project_id`,`channel`);--> statement-breakpoint
CREATE INDEX `tl_project_idx` ON `tech_lights` (`project_id`,`universe`,`address`);