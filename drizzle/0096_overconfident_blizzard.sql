CREATE TABLE `agenda_viewers` (
	`owner_user_id` int NOT NULL,
	`viewer_user_id` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `agenda_viewers_owner_user_id_viewer_user_id_pk` PRIMARY KEY(`owner_user_id`,`viewer_user_id`)
);
--> statement-breakpoint
ALTER TABLE `users` DROP FOREIGN KEY `users_tutor_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `roles` ADD `is_company` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `agenda_viewers` ADD CONSTRAINT `agenda_viewers_owner_user_id_users_id_fk` FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agenda_viewers` ADD CONSTRAINT `agenda_viewers_viewer_user_id_users_id_fk` FOREIGN KEY (`viewer_user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `agenda_viewers_viewer_idx` ON `agenda_viewers` (`viewer_user_id`);--> statement-breakpoint
INSERT INTO `agenda_viewers` (`owner_user_id`, `viewer_user_id`, `created_at`) SELECT `id`, `tutor_user_id`, NOW() FROM `users` WHERE `tutor_user_id` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `tutor_user_id`;