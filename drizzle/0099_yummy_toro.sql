CREATE TABLE `bde_financial_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`direction` enum('income','expense') NOT NULL DEFAULT 'expense',
	`category` enum('cotisations','subventions','dons','evenements','ventes','prestations','fonctionnement','deplacements','materiel','communication','banque','autre') NOT NULL DEFAULT 'autre',
	`label` varchar(200) NOT NULL,
	`amount_cents` int NOT NULL DEFAULT 0,
	`occurred_on` date NOT NULL,
	`method` varchar(40),
	`reference` varchar(120),
	`notes` text,
	`created_at` datetime NOT NULL,
	`created_by` int,
	CONSTRAINT `bde_financial_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bde_financial_entries` ADD CONSTRAINT `bde_financial_entries_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bde_fin_date_idx` ON `bde_financial_entries` (`occurred_on`);