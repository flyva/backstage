CREATE TABLE `wiki_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`file` varchar(60) NOT NULL,
	`original_name` varchar(200) NOT NULL,
	`mime` varchar(60) NOT NULL,
	`size` int NOT NULL,
	`uploaded_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `wiki_files_id` PRIMARY KEY(`id`),
	CONSTRAINT `wiki_files_file_unique` UNIQUE(`file`)
);
--> statement-breakpoint
ALTER TABLE `wiki_pages` ADD `parent_id` int;--> statement-breakpoint
ALTER TABLE `wiki_files` ADD CONSTRAINT `wiki_files_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;