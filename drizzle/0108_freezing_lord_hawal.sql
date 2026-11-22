CREATE TABLE `domaines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	CONSTRAINT `domaines_id` PRIMARY KEY(`id`),
	CONSTRAINT `domaines_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `track_referents` (
	`user_id` int NOT NULL,
	`track_id` int NOT NULL,
	CONSTRAINT `track_referents_user_id_track_id_pk` PRIMARY KEY(`user_id`,`track_id`)
);
--> statement-breakpoint
CREATE TABLE `user_formations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`track_id` int NOT NULL,
	`year` int NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL,
	CONSTRAINT `user_formations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `classes` ADD `start_year` int;--> statement-breakpoint
ALTER TABLE `classes` ADD `end_year` int;--> statement-breakpoint
ALTER TABLE `roles` ADD `is_test` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `tracks` ADD `short_name` varchar(20);--> statement-breakpoint
ALTER TABLE `tracks` ADD `domaine_id` int;--> statement-breakpoint
ALTER TABLE `tracks` ADD `years_count` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `track_referents` ADD CONSTRAINT `track_referents_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `track_referents` ADD CONSTRAINT `track_referents_track_id_tracks_id_fk` FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_formations` ADD CONSTRAINT `user_formations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_formations` ADD CONSTRAINT `user_formations_track_id_tracks_id_fk` FOREIGN KEY (`track_id`) REFERENCES `tracks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `user_formations_user_idx` ON `user_formations` (`user_id`);--> statement-breakpoint
ALTER TABLE `tracks` ADD CONSTRAINT `tracks_domaine_id_domaines_id_fk` FOREIGN KEY (`domaine_id`) REFERENCES `domaines`(`id`) ON DELETE set null ON UPDATE no action;