CREATE TABLE `expense_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`photo_file` varchar(60) NOT NULL,
	`date` date NOT NULL,
	`time` varchar(5) NOT NULL,
	`place` varchar(200) NOT NULL,
	`price_cents` int NOT NULL,
	`comment` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `expense_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `expense_notes` ADD CONSTRAINT `expense_notes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `exp_user_date_idx` ON `expense_notes` (`user_id`,`date`);