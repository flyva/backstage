CREATE TABLE `time_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`day` date NOT NULL,
	`start_minutes` int NOT NULL,
	`end_minutes` int NOT NULL,
	`pause_minutes` int NOT NULL DEFAULT 0,
	`comment` varchar(300),
	`created_at` datetime NOT NULL,
	CONSTRAINT `time_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `work_days` MODIFY COLUMN `kind` enum('ecole','entreprise','conge','ferie','maladie') NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `standard_work_minutes` int DEFAULT 420 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `tutor_user_id` int;--> statement-breakpoint
ALTER TABLE `time_entries` ADD CONSTRAINT `time_entries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `te_user_day_idx` ON `time_entries` (`user_id`,`day`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_tutor_user_id_users_id_fk` FOREIGN KEY (`tutor_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;