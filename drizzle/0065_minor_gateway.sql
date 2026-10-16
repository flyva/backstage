ALTER TABLE `work_logs` ADD `end_day` date;--> statement-breakpoint
UPDATE `work_logs` SET `end_day` = `day` WHERE `end_day` IS NULL;--> statement-breakpoint
ALTER TABLE `work_logs` MODIFY COLUMN `end_day` date NOT NULL;