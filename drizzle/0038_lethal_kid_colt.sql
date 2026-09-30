ALTER TABLE `users` ADD `discord` varchar(40);--> statement-breakpoint
ALTER TABLE `users` ADD `card_show_discord` boolean DEFAULT false NOT NULL;