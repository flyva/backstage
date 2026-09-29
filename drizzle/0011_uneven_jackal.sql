ALTER TABLE `users` MODIFY COLUMN `theme` enum('system','light','dark') NOT NULL DEFAULT 'light';--> statement-breakpoint
ALTER TABLE `users` ADD `accent` enum('ambre','bleu','indigo','vert','rose') DEFAULT 'ambre' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `sidebar` enum('dark','light') DEFAULT 'dark' NOT NULL;