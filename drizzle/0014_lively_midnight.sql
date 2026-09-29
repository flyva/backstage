ALTER TABLE `users` ADD `first_name` varchar(60) DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `last_name` varchar(60) DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `users` SET `first_name` = SUBSTRING_INDEX(TRIM(`name`), ' ', 1), `last_name` = TRIM(SUBSTRING(TRIM(`name`), LENGTH(SUBSTRING_INDEX(TRIM(`name`), ' ', 1)) + 1)) WHERE `first_name` = '';
