CREATE TABLE `listings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`category` enum('vente','logement','mission','recherche','don','autre') NOT NULL DEFAULT 'vente',
	`title` varchar(120) NOT NULL,
	`description` text NOT NULL,
	`price` varchar(40),
	`contact` varchar(160) NOT NULL,
	`photo_file` varchar(40),
	`status` enum('active','closed') NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL,
	`expires_at` datetime NOT NULL,
	CONSTRAINT `listings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poll_invites` (
	`poll_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `poll_invites_poll_id_user_id_pk` PRIMARY KEY(`poll_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `poll_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poll_id` int NOT NULL,
	`starts_at` datetime NOT NULL,
	`ends_at` datetime,
	CONSTRAINT `poll_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `poll_votes` (
	`option_id` int NOT NULL,
	`user_id` int NOT NULL,
	`answer` enum('yes','maybe','no') NOT NULL,
	CONSTRAINT `poll_votes_option_id_user_id_pk` PRIMARY KEY(`option_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `polls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creator_id` int NOT NULL,
	`title` varchar(150) NOT NULL,
	`description` varchar(500),
	`closed` boolean NOT NULL DEFAULT false,
	`final_option_id` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `polls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `feed_token` varchar(32);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_feed_token_unique` UNIQUE(`feed_token`);--> statement-breakpoint
ALTER TABLE `listings` ADD CONSTRAINT `listings_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_invites` ADD CONSTRAINT `poll_invites_poll_id_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_invites` ADD CONSTRAINT `poll_invites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_options` ADD CONSTRAINT `poll_options_poll_id_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_option_id_poll_options_id_fk` FOREIGN KEY (`option_id`) REFERENCES `poll_options`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `poll_votes` ADD CONSTRAINT `poll_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `polls` ADD CONSTRAINT `polls_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `listing_status_idx` ON `listings` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `listing_user_idx` ON `listings` (`user_id`);--> statement-breakpoint
CREATE INDEX `pi_user_idx` ON `poll_invites` (`user_id`);--> statement-breakpoint
CREATE INDEX `po_poll_idx` ON `poll_options` (`poll_id`,`starts_at`);--> statement-breakpoint
CREATE INDEX `pv_user_idx` ON `poll_votes` (`user_id`);--> statement-breakpoint
CREATE INDEX `poll_creator_idx` ON `polls` (`creator_id`);