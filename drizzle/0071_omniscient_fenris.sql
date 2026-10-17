CREATE TABLE `conversation_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversation_id` int NOT NULL,
	`user_id` int NOT NULL,
	`read_at` datetime,
	`joined_at` datetime NOT NULL,
	`left_at` datetime,
	CONSTRAINT `conversation_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `cm_conv_user_idx` UNIQUE(`conversation_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `conversations` ADD `kind` enum('listing','dm','group') DEFAULT 'dm' NOT NULL;--> statement-breakpoint
ALTER TABLE `conversations` ADD `name` varchar(120);--> statement-breakpoint
UPDATE `conversations` SET `kind` = 'listing' WHERE `listing_id` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_members` ADD CONSTRAINT `conversation_members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cm_user_idx` ON `conversation_members` (`user_id`);