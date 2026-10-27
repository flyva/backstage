CREATE TABLE `company_statuses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(40) NOT NULL,
	`label` varchar(60) NOT NULL,
	`color` enum('zinc','slate','red','rose','orange','amber','emerald','teal','sky','blue','indigo','violet','pink') NOT NULL DEFAULT 'zinc',
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `company_statuses_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_statuses_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `alt_company_searches` MODIFY COLUMN `status` varchar(40);