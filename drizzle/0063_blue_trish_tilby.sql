ALTER TABLE `time_entries` ADD `end_day` date;--> statement-breakpoint
UPDATE `time_entries` SET `end_day` = `day` WHERE `end_day` IS NULL;--> statement-breakpoint
ALTER TABLE `time_entries` MODIFY COLUMN `end_day` date NOT NULL;