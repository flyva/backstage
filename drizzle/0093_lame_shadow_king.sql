CREATE TABLE `email_bank_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(150) NOT NULL,
	`email` varchar(300) NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT '',
	`note` varchar(300) NOT NULL DEFAULT '',
	`created_by_user_id` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `email_bank_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `email_bank_entries` ADD CONSTRAINT `email_bank_entries_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_bank_category_idx` ON `email_bank_entries` (`category`);