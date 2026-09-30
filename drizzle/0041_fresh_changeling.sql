CREATE TABLE `listing_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listing_id` int NOT NULL,
	`file` varchar(40) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL,
	CONSTRAINT `listing_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `listing_photos` ADD CONSTRAINT `listing_photos_listing_id_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `lp_listing_idx` ON `listing_photos` (`listing_id`,`position`);