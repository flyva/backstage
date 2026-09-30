CREATE TABLE `kanban_checklist` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`text` varchar(200) NOT NULL,
	`done` boolean NOT NULL DEFAULT false,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `kanban_checklist_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kanban_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`card_id` int NOT NULL,
	`user_id` int NOT NULL,
	`body` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `kanban_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `start_date` date;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `priority` enum('low','normal','high','urgent') DEFAULT 'normal' NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_cards` ADD `labels` varchar(200);--> statement-breakpoint
ALTER TABLE `project_files` ADD `card_id` int;--> statement-breakpoint
ALTER TABLE `kanban_checklist` ADD CONSTRAINT `kanban_checklist_card_id_kanban_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kanban_comments` ADD CONSTRAINT `kanban_comments_card_id_kanban_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kanban_comments` ADD CONSTRAINT `kanban_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `kcl_card_idx` ON `kanban_checklist` (`card_id`,`position`);--> statement-breakpoint
CREATE INDEX `kcm_card_idx` ON `kanban_comments` (`card_id`,`created_at`);--> statement-breakpoint
ALTER TABLE `project_files` ADD CONSTRAINT `project_files_card_id_kanban_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON DELETE cascade ON UPDATE no action;