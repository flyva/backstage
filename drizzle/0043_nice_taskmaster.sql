CREATE TABLE `courses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`uid` varchar(255) NOT NULL,
	`title` varchar(255) NOT NULL,
	`location` varchar(255) NOT NULL DEFAULT '',
	`description` text,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime NOT NULL,
	`all_day` boolean NOT NULL DEFAULT false,
	`note` text,
	`removed` boolean NOT NULL DEFAULT false,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `courses_id` PRIMARY KEY(`id`),
	CONSTRAINT `course_user_uid` UNIQUE(`user_id`,`uid`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `ical_synced_at` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `ical_tried_at` datetime;--> statement-breakpoint
ALTER TABLE `users` ADD `ical_error` varchar(200);--> statement-breakpoint
ALTER TABLE `courses` ADD CONSTRAINT `courses_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `course_user_start` ON `courses` (`user_id`,`starts_at`);