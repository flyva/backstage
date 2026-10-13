CREATE TABLE `ticket_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`user_id` int NOT NULL,
	`body` text NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `ticket_comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ticket_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticket_id` int NOT NULL,
	`file` varchar(60) NOT NULL,
	`original_name` varchar(200) NOT NULL,
	`mime` varchar(60) NOT NULL,
	`size` int NOT NULL,
	`uploaded_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `ticket_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tickets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`body` text NOT NULL,
	`status` enum('open','in_progress','closed') NOT NULL DEFAULT 'open',
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `tickets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `updates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`body` text NOT NULL,
	`author_id` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `updates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `useful_links` ADD `icon` varchar(60);--> statement-breakpoint
ALTER TABLE `ticket_comments` ADD CONSTRAINT `ticket_comments_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_comments` ADD CONSTRAINT `ticket_comments_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_files` ADD CONSTRAINT `ticket_files_ticket_id_tickets_id_fk` FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ticket_files` ADD CONSTRAINT `ticket_files_uploaded_by_users_id_fk` FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `updates` ADD CONSTRAINT `updates_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tc_ticket_idx` ON `ticket_comments` (`ticket_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `tf_ticket_idx` ON `ticket_files` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `tickets_user_idx` ON `tickets` (`created_by`,`created_at`);