ALTER TABLE `users` ADD `notify_messages` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `notify_listings` boolean DEFAULT false NOT NULL;