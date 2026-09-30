CREATE TABLE `kanban_card_assignees` (
	`card_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `kanban_card_assignees_card_id_user_id_pk` PRIMARY KEY(`card_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `kanban_cards` DROP FOREIGN KEY `kanban_cards_assignee_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `kanban_card_assignees` ADD CONSTRAINT `kanban_card_assignees_card_id_kanban_cards_id_fk` FOREIGN KEY (`card_id`) REFERENCES `kanban_cards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kanban_card_assignees` ADD CONSTRAINT `kanban_card_assignees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `kca_user_idx` ON `kanban_card_assignees` (`user_id`);--> statement-breakpoint
INSERT INTO `kanban_card_assignees` (`card_id`, `user_id`) SELECT `id`, `assignee_id` FROM `kanban_cards` WHERE `assignee_id` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `kanban_cards` DROP COLUMN `assignee_id`;