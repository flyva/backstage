CREATE TABLE `quiz_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`course_key` varchar(40) NOT NULL,
	`question` varchar(500) NOT NULL,
	`choice_a` varchar(300) NOT NULL,
	`choice_b` varchar(300) NOT NULL,
	`choice_c` varchar(300) NOT NULL,
	`choice_d` varchar(300) NOT NULL,
	`answer` int NOT NULL,
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `quiz_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `quiz_questions` ADD CONSTRAINT `quiz_questions_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `qq_course_idx` ON `quiz_questions` (`course_key`);