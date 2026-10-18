CREATE TABLE `conversation_mutes` (
	`conversation_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `conversation_mutes_conversation_id_user_id_pk` PRIMARY KEY(`conversation_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `personal_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`author_id` int NOT NULL,
	`about_user_id` int NOT NULL,
	`note` text NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `personal_notes_id` PRIMARY KEY(`id`),
	CONSTRAINT `pn_author_about_idx` UNIQUE(`author_id`,`about_user_id`)
);
--> statement-breakpoint
ALTER TABLE `conversation_mutes` ADD CONSTRAINT `conversation_mutes_conversation_id_conversations_id_fk` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `conversation_mutes` ADD CONSTRAINT `conversation_mutes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personal_notes` ADD CONSTRAINT `personal_notes_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personal_notes` ADD CONSTRAINT `personal_notes_about_user_id_users_id_fk` FOREIGN KEY (`about_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;