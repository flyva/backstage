CREATE TABLE `news_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` mediumtext NOT NULL,
	`scope` enum('ecole','bde') NOT NULL DEFAULT 'ecole',
	`pinned` boolean NOT NULL DEFAULT false,
	`author_id` int NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `news_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `news_posts` ADD CONSTRAINT `news_posts_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `news_created_idx` ON `news_posts` (`pinned`,`created_at`);