CREATE TABLE `alt_companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`name_key` varchar(220) NOT NULL,
	`city` varchar(120) NOT NULL DEFAULT '',
	`department` varchar(20) NOT NULL DEFAULT '',
	`sector` varchar(150) NOT NULL DEFAULT '',
	`address` varchar(300) NOT NULL DEFAULT '',
	`types` varchar(40) NOT NULL DEFAULT '',
	`salary` varchar(120) NOT NULL DEFAULT '',
	`sources` varchar(200) NOT NULL DEFAULT '',
	`perks` varchar(300) NOT NULL DEFAULT '',
	`contact_title` varchar(120) NOT NULL DEFAULT '',
	`contact_name` varchar(150) NOT NULL DEFAULT '',
	`phone` varchar(60) NOT NULL DEFAULT '',
	`email` varchar(300) NOT NULL DEFAULT '',
	`created_by_user_id` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `alt_companies_id` PRIMARY KEY(`id`),
	CONSTRAINT `alt_companies_name_key` UNIQUE(`name_key`)
);
--> statement-breakpoint
CREATE TABLE `alt_company_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`company_id` int NOT NULL,
	`user_id` int NOT NULL,
	`kind` enum('offre','spontanee'),
	`status` enum('a_contacter','cv_envoye','relance','rappeler','entretien_prevu','en_cours','valider','refuser','refuse_apres_entretien','annuler'),
	`priority` enum('faible','moyenne','haute'),
	`last_contact_date` date,
	`interview_date` date,
	`delay_days` int,
	`note` text NOT NULL DEFAULT (''),
	`created_at` datetime NOT NULL,
	CONSTRAINT `alt_company_searches_id` PRIMARY KEY(`id`),
	CONSTRAINT `alt_search_company_user` UNIQUE(`company_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `alt_companies` ADD CONSTRAINT `alt_companies_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alt_company_searches` ADD CONSTRAINT `alt_company_searches_company_id_alt_companies_id_fk` FOREIGN KEY (`company_id`) REFERENCES `alt_companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `alt_company_searches` ADD CONSTRAINT `alt_company_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `alt_companies_city_idx` ON `alt_companies` (`city`);--> statement-breakpoint
CREATE INDEX `alt_search_user_idx` ON `alt_company_searches` (`user_id`);