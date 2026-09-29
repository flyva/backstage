CREATE TABLE `kanban_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`column_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`assignee_id` int,
	`due_date` date,
	`position` int NOT NULL DEFAULT 0,
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `kanban_cards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_columns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`title` varchar(80) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `kanban_columns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD CONSTRAINT `kanban_cards_column_id_kanban_columns_id_fk` FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD CONSTRAINT `kanban_cards_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD CONSTRAINT `kanban_cards_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kanban_columns` ADD CONSTRAINT `kanban_columns_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `kcard_col_idx` ON `kanban_cards` (`column_id`,`position`);--> statement-breakpoint
CREATE INDEX `kc_project_idx` ON `kanban_columns` (`project_id`,`position`);