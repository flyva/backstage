CREATE TABLE `bde_officer_titles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(80) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bde_officer_titles_id` PRIMARY KEY(`id`),
	CONSTRAINT `bde_officer_titles_label_unique` UNIQUE(`label`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `bde_status` enum('bureau','ca','liste');--> statement-breakpoint
ALTER TABLE `users` ADD `bde_title` varchar(80);