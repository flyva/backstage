CREATE TABLE `push_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`endpoint` varchar(600) NOT NULL,
	`p256dh` varchar(255) NOT NULL,
	`auth` varchar(100) NOT NULL,
	`user_agent` varchar(200),
	`created_at` datetime NOT NULL,
	CONSTRAINT `push_subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_subscriptions_endpoint_unique` UNIQUE(`endpoint`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `notify_news` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_bde` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_loans` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `push_subscriptions` ADD CONSTRAINT `push_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ps_user_idx` ON `push_subscriptions` (`user_id`);