CREATE TABLE `calc_supply_lists` (
	`user_id` int NOT NULL,
	`kind` enum('mono','tetra') NOT NULL DEFAULT 'tetra',
	`items` mediumtext NOT NULL DEFAULT '[]',
	`updated_at` datetime NOT NULL,
	CONSTRAINT `calc_supply_lists_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `calc_supply_lists` ADD CONSTRAINT `calc_supply_lists_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;