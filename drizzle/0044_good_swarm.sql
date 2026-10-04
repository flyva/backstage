CREATE TABLE `course_sheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subject_key` varchar(190) NOT NULL,
	`content` mediumtext NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `course_sheets_id` PRIMARY KEY(`id`),
	CONSTRAINT `sheet_user_subject` UNIQUE(`user_id`,`subject_key`)
);
--> statement-breakpoint
ALTER TABLE `course_sheets` ADD CONSTRAINT `course_sheets_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;