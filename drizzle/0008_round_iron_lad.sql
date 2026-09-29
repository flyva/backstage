CREATE TABLE `gallery_albums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`description` varchar(500),
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `gallery_albums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gallery_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`album_id` int NOT NULL,
	`kind` enum('image','video') NOT NULL,
	`file` varchar(60) NOT NULL,
	`thumb` varchar(60),
	`caption` varchar(300),
	`uploader_id` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `gallery_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `gallery_albums` ADD CONSTRAINT `gallery_albums_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gallery_items` ADD CONSTRAINT `gallery_items_album_id_gallery_albums_id_fk` FOREIGN KEY (`album_id`) REFERENCES `gallery_albums`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gallery_items` ADD CONSTRAINT `gallery_items_uploader_id_users_id_fk` FOREIGN KEY (`uploader_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `gi_album_idx` ON `gallery_items` (`album_id`,`created_at`);