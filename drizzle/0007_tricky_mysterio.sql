CREATE TABLE `bde_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text,
	`starts_at` datetime NOT NULL,
	`location` varchar(200),
	`capacity` int,
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bde_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bde_idea_votes` (
	`idea_id` int NOT NULL,
	`user_id` int NOT NULL,
	CONSTRAINT `bde_idea_votes_idea_id_user_id_pk` PRIMARY KEY(`idea_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `bde_ideas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`body` varchar(1000) NOT NULL,
	`status` enum('new','planned','done','rejected') NOT NULL DEFAULT 'new',
	`created_at` datetime NOT NULL,
	CONSTRAINT `bde_ideas_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bde_poll_options` (
	`id` int AUTO_INCREMENT NOT NULL,
	`poll_id` int NOT NULL,
	`label` varchar(150) NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `bde_poll_options_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bde_poll_votes` (
	`poll_id` int NOT NULL,
	`user_id` int NOT NULL,
	`option_id` int NOT NULL,
	CONSTRAINT `bde_poll_votes_poll_id_user_id_pk` PRIMARY KEY(`poll_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `bde_polls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question` varchar(255) NOT NULL,
	`closes_at` datetime,
	`created_by` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bde_polls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bde_registrations` (
	`event_id` int NOT NULL,
	`user_id` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bde_registrations_event_id_user_id_pk` PRIMARY KEY(`event_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `bde_events` ADD CONSTRAINT `bde_events_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_idea_votes` ADD CONSTRAINT `bde_idea_votes_idea_id_bde_ideas_id_fk` FOREIGN KEY (`idea_id`) REFERENCES `bde_ideas`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_idea_votes` ADD CONSTRAINT `bde_idea_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_ideas` ADD CONSTRAINT `bde_ideas_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_poll_options` ADD CONSTRAINT `bde_poll_options_poll_id_bde_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `bde_polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_poll_votes` ADD CONSTRAINT `bde_poll_votes_poll_id_bde_polls_id_fk` FOREIGN KEY (`poll_id`) REFERENCES `bde_polls`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_poll_votes` ADD CONSTRAINT `bde_poll_votes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_poll_votes` ADD CONSTRAINT `bde_poll_votes_option_id_bde_poll_options_id_fk` FOREIGN KEY (`option_id`) REFERENCES `bde_poll_options`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_polls` ADD CONSTRAINT `bde_polls_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_registrations` ADD CONSTRAINT `bde_registrations_event_id_bde_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `bde_events`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_registrations` ADD CONSTRAINT `bde_registrations_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bde_ev_start_idx` ON `bde_events` (`starts_at`);--> statement-breakpoint
CREATE INDEX `bde_opt_poll_idx` ON `bde_poll_options` (`poll_id`);