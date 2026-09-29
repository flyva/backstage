CREATE TABLE `equipment_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`category` varchar(80) NOT NULL DEFAULT 'Divers',
	`code` varchar(40),
	`description` text,
	`location` varchar(120),
	`quantity` int NOT NULL DEFAULT 1,
	`status` enum('active','maintenance','retired') NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL,
	CONSTRAINT `equipment_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `loans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`item_id` int NOT NULL,
	`user_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`status` enum('requested','reserved','out','returned','rejected','cancelled') NOT NULL DEFAULT 'requested',
	`start_date` date NOT NULL,
	`due_date` date NOT NULL,
	`note` varchar(500),
	`condition_out` varchar(500),
	`condition_in` varchar(500),
	`requested_at` datetime NOT NULL,
	`out_at` datetime,
	`returned_at` datetime,
	CONSTRAINT `loans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','materiel','bde','member') NOT NULL DEFAULT 'member';--> statement-breakpoint
ALTER TABLE `loans` ADD CONSTRAINT `loans_item_id_equipment_items_id_fk` FOREIGN KEY (`item_id`) REFERENCES `equipment_items`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `loans` ADD CONSTRAINT `loans_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `loan_item_idx` ON `loans` (`item_id`,`status`);--> statement-breakpoint
CREATE INDEX `loan_user_idx` ON `loans` (`user_id`);