ALTER TABLE `users` ADD `status` enum('active','pending') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `google_sub` varchar(40);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_google_sub_unique` UNIQUE(`google_sub`);