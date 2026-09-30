CREATE TABLE `build_slot_assignees` (
	`slot_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `build_slot_assignees_slot_id_user_id_pk` PRIMARY KEY(`slot_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `build_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`day` date NOT NULL,
	`start_time` varchar(5) NOT NULL,
	`end_time` varchar(5) NOT NULL,
	`title` varchar(200) NOT NULL,
	`notes` varchar(500),
	`created_at` datetime NOT NULL,
	CONSTRAINT `build_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `console_memories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`console` varchar(80),
	`number` varchar(30),
	`category` varchar(60),
	`notes` text,
	`image` varchar(120),
	`tags` varchar(200),
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `console_memories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fixture_models` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`mode` varchar(60),
	`footprint` int NOT NULL DEFAULT 1,
	`watts` int,
	`notes` varchar(300),
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `fixture_models_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `power_circuits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`name` varchar(60) NOT NULL,
	`breaker_amps` int NOT NULL DEFAULT 16,
	`phase` int NOT NULL DEFAULT 1,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `power_circuits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `power_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`circuit_id` int,
	`name` varchar(120) NOT NULL,
	`watts` int NOT NULL,
	`qty` int NOT NULL DEFAULT 1,
	CONSTRAINT `power_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ride_passengers` (
	`ride_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `ride_passengers_ride_id_user_id_pk` PRIMARY KEY(`ride_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driver_id` int NOT NULL,
	`title` varchar(150) NOT NULL,
	`from_place` varchar(200) NOT NULL,
	`to_place` varchar(200) NOT NULL,
	`departs_at` datetime NOT NULL,
	`seats` int NOT NULL DEFAULT 3,
	`notes` varchar(300),
	`created_at` datetime NOT NULL,
	CONSTRAINT `rides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `work_days` (
	`user_id` int NOT NULL,
	`day` date NOT NULL,
	`kind` enum('ecole','entreprise','conge','ferie') NOT NULL,
	CONSTRAINT `work_days_user_id_day_pk` PRIMARY KEY(`user_id`,`day`)
);
--> statement-breakpoint
CREATE TABLE `work_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`day` date NOT NULL,
	`minutes` int NOT NULL DEFAULT 0,
	`place` enum('entreprise','ecole') NOT NULL DEFAULT 'entreprise',
	`mission` text NOT NULL,
	`skills` varchar(300),
	`created_at` datetime NOT NULL,
	CONSTRAINT `work_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `notify_reminders` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `build_slot_assignees` ADD CONSTRAINT `build_slot_assignees_slot_id_build_slots_id_fk` FOREIGN KEY (`slot_id`) REFERENCES `build_slots`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `build_slot_assignees` ADD CONSTRAINT `build_slot_assignees_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `build_slots` ADD CONSTRAINT `build_slots_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `console_memories` ADD CONSTRAINT `console_memories_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fixture_models` ADD CONSTRAINT `fixture_models_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `power_circuits` ADD CONSTRAINT `power_circuits_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `power_items` ADD CONSTRAINT `power_items_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `power_items` ADD CONSTRAINT `power_items_circuit_id_power_circuits_id_fk` FOREIGN KEY (`circuit_id`) REFERENCES `power_circuits`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ride_passengers` ADD CONSTRAINT `ride_passengers_ride_id_rides_id_fk` FOREIGN KEY (`ride_id`) REFERENCES `rides`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ride_passengers` ADD CONSTRAINT `ride_passengers_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_driver_id_users_id_fk` FOREIGN KEY (`driver_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_days` ADD CONSTRAINT `work_days_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `work_logs` ADD CONSTRAINT `work_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bs_project_idx` ON `build_slots` (`project_id`,`day`,`start_time`);--> statement-breakpoint
CREATE INDEX `cm_console_idx` ON `console_memories` (`console`);--> statement-breakpoint
CREATE INDEX `pc_project_idx` ON `power_circuits` (`project_id`);--> statement-breakpoint
CREATE INDEX `pi_project_idx` ON `power_items` (`project_id`);--> statement-breakpoint
CREATE INDEX `ride_departs_idx` ON `rides` (`departs_at`);--> statement-breakpoint
CREATE INDEX `wl_user_day_idx` ON `work_logs` (`user_id`,`day`);