CREATE TABLE `company_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`search_id` int NOT NULL,
	`type` enum('appel','mail','physique') NOT NULL,
	`contact_date` date NOT NULL,
	`comment` text NOT NULL DEFAULT (''),
	`created_at` datetime NOT NULL,
	CONSTRAINT `company_contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_interviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`search_id` int NOT NULL,
	`interview_date` date NOT NULL,
	`note` varchar(255) NOT NULL DEFAULT '',
	`created_at` datetime NOT NULL,
	CONSTRAINT `company_interviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `company_contacts` ADD CONSTRAINT `company_contacts_search_id_alt_company_searches_id_fk` FOREIGN KEY (`search_id`) REFERENCES `alt_company_searches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_interviews` ADD CONSTRAINT `company_interviews_search_id_alt_company_searches_id_fk` FOREIGN KEY (`search_id`) REFERENCES `alt_company_searches`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `company_contacts_search_idx` ON `company_contacts` (`search_id`);--> statement-breakpoint
CREATE INDEX `company_interviews_search_idx` ON `company_interviews` (`search_id`);--> statement-breakpoint
INSERT INTO `company_interviews` (`search_id`, `interview_date`, `note`, `created_at`) SELECT `id`, `interview_date`, '', NOW() FROM `alt_company_searches` WHERE `interview_date` IS NOT NULL;--> statement-breakpoint
ALTER TABLE `alt_company_searches` DROP COLUMN `interview_date`;