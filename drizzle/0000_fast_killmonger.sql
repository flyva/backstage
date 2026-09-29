CREATE TABLE `faq_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'Général',
	`question` varchar(255) NOT NULL,
	`answer` text NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `faq_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` int NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` varchar(80) NOT NULL,
	`value` text NOT NULL,
	CONSTRAINT `settings_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `useful_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'École',
	`label` varchar(120) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`description` varchar(255),
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `useful_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(190) NOT NULL,
	`name` varchar(120) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`role` enum('admin','bde','member') NOT NULL DEFAULT 'member',
	`theme` enum('system','light','dark') NOT NULL DEFAULT 'system',
	`home_address` varchar(255),
	`home_lat` double,
	`home_lng` double,
	`ical_url` varchar(1000),
	`onboarded` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sessions_user_idx` ON `sessions` (`user_id`);