CREATE TABLE `network_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`job_title` varchar(120),
	`company` varchar(120),
	`email` varchar(190),
	`phone` varchar(30),
	`link_url` varchar(300),
	`notes` text,
	`created_at` datetime NOT NULL,
	CONSTRAINT `network_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `tracks_id` PRIMARY KEY(`id`),
	CONSTRAINT `tracks_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `user_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`kind` enum('linkedin','instagram','youtube','vimeo','behance','github','tiktok','x','facebook','portfolio','site','autre') NOT NULL DEFAULT 'site',
	`url` varchar(300) NOT NULL,
	`label` varchar(60),
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `user_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `track_id` int;--> statement-breakpoint
ALTER TABLE `users` ADD `avatar_file` varchar(40);--> statement-breakpoint
ALTER TABLE `users` ADD `headline` varchar(120);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(30);--> statement-breakpoint
ALTER TABLE `users` ADD `contact_email` varchar(190);--> statement-breakpoint
ALTER TABLE `users` ADD `show_in_directory` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `show_phone` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `card_slug` varchar(16);--> statement-breakpoint
ALTER TABLE `users` ADD `card_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_card_slug_unique` UNIQUE(`card_slug`);--> statement-breakpoint
ALTER TABLE `network_contacts` ADD CONSTRAINT `network_contacts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_links` ADD CONSTRAINT `user_links_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `nc_user_idx` ON `network_contacts` (`user_id`);--> statement-breakpoint
CREATE INDEX `ul_user_idx` ON `user_links` (`user_id`);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_track_id_tracks_id_fk` FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
INSERT INTO `tracks` (`name`, `sort_order`) VALUES ('Spectacle et évènementiel', 1), ('Cinéma et audiovisuel', 2), ('Son et sound design', 3), ('Musique', 4), ('Acting', 5);
