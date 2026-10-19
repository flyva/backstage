CREATE TABLE `work_log_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`work_log_id` int NOT NULL,
	`file_name` varchar(60) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `work_log_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `work_logs` ADD `title` varchar(150);--> statement-breakpoint
ALTER TABLE `work_log_files` ADD CONSTRAINT `work_log_files_work_log_id_work_logs_id_fk` FOREIGN KEY (`work_log_id`) REFERENCES `work_logs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `wlf_log_idx` ON `work_log_files` (`work_log_id`);