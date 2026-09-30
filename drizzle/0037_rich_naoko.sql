ALTER TABLE `users` MODIFY COLUMN `status` enum('active','pending','disabled','rejected') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `rejection_note` varchar(500);