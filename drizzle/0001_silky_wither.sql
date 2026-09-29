CREATE TABLE `checklist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checklist_id` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`done` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `checklist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `checklists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`title` varchar(150) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `checklists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `project_members` (
	`project_id` int NOT NULL,
	`user_id` int NOT NULL,
	`role` enum('owner','editor','viewer') NOT NULL DEFAULT 'editor',
	`added_at` datetime NOT NULL,
	CONSTRAINT `project_members_project_id_user_id_pk` PRIMARY KEY(`project_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`description` text,
	`event_date` varchar(10),
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `checklist_items` ADD CONSTRAINT `checklist_items_checklist_id_checklists_id_fk` FOREIGN KEY (`checklist_id`) REFERENCES `checklists`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `checklists` ADD CONSTRAINT `checklists_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `project_members` ADD CONSTRAINT `project_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ci_checklist_idx` ON `checklist_items` (`checklist_id`);--> statement-breakpoint
CREATE INDEX `cl_project_idx` ON `checklists` (`project_id`);--> statement-breakpoint
CREATE INDEX `pm_user_idx` ON `project_members` (`user_id`);