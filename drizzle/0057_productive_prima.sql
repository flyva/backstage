ALTER TABLE `tickets` ADD `last_actor_id` int;--> statement-breakpoint
ALTER TABLE `tickets` ADD `owner_read_at` datetime;--> statement-breakpoint
ALTER TABLE `updates` ADD `kind` enum('feature','fix','maintenance') DEFAULT 'feature' NOT NULL;--> statement-breakpoint
ALTER TABLE `updates` ADD `important` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_updates` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD CONSTRAINT `tickets_last_actor_id_users_id_fk` FOREIGN KEY (`last_actor_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;