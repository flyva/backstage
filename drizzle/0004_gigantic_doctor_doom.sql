CREATE TABLE `wiki_pages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(160) NOT NULL,
	`title` varchar(200) NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'Général',
	`body` mediumtext NOT NULL,
	`created_by` int NOT NULL,
	`updated_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `wiki_pages_id` PRIMARY KEY(`id`),
	CONSTRAINT `wiki_pages_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `wiki_revisions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`page_id` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` mediumtext NOT NULL,
	`editor_id` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `wiki_revisions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD CONSTRAINT `wiki_pages_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD CONSTRAINT `wiki_pages_updated_by_users_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wiki_revisions` ADD CONSTRAINT `wiki_revisions_page_id_wiki_pages_id_fk` FOREIGN KEY (`page_id`) REFERENCES `wiki_pages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wiki_revisions` ADD CONSTRAINT `wiki_revisions_editor_id_users_id_fk` FOREIGN KEY (`editor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wr_page_idx` ON `wiki_revisions` (`page_id`,`created_at`);