CREATE TABLE `resource_favorites` (
	`resource_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `resource_favorites_resource_id_user_id_pk` PRIMARY KEY(`resource_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `resource_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('outils','sites_ressources','jobboards','sites_carrieres') NOT NULL,
	`label` varchar(150) NOT NULL,
	`url` varchar(1000) NOT NULL,
	`description` varchar(300) NOT NULL DEFAULT '',
	`created_by_user_id` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `resource_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `resource_favorites` ADD CONSTRAINT `resource_favorites_resource_id_resource_links_id_fk` FOREIGN KEY (`resource_id`) REFERENCES `resource_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_favorites` ADD CONSTRAINT `resource_favorites_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `resource_links` ADD CONSTRAINT `resource_links_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `resource_links_category_idx` ON `resource_links` (`category`);