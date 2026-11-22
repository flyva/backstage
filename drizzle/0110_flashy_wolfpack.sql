CREATE TABLE `pending_email_verifications` (
	`user_id` int NOT NULL,
	`email` varchar(190) NOT NULL,
	`code_hash` varchar(64) NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `pending_email_verifications_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `institutional_email` varchar(190);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_institutional_email_unique` UNIQUE(`institutional_email`);--> statement-breakpoint
ALTER TABLE `pending_email_verifications` ADD CONSTRAINT `pending_email_verifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;