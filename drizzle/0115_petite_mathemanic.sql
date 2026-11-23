ALTER TABLE `company_interviews` ADD `interview_time` varchar(5) DEFAULT '09:00' NOT NULL;--> statement-breakpoint
ALTER TABLE `company_interviews` ADD `mode` enum('visio','presentiel') DEFAULT 'presentiel' NOT NULL;--> statement-breakpoint
ALTER TABLE `company_interviews` ADD `visio_url` varchar(500);