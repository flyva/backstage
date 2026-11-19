CREATE TABLE `bde_accounting_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`number` varchar(20) NOT NULL,
	`name_normal` varchar(150) NOT NULL,
	`name_arranged` varchar(150) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bde_accounting_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bde_bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`bank_name` varchar(120),
	`is_default` boolean NOT NULL DEFAULT false,
	`balance_cents` int NOT NULL DEFAULT 0,
	`balance_updated_at` date,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bde_bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bde_budget_forecasts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fiscal_year_id` int NOT NULL,
	`accounting_account_id` int NOT NULL,
	`direction` enum('income','expense') NOT NULL DEFAULT 'expense',
	`amount_cents` int NOT NULL DEFAULT 0,
	`notes` varchar(500),
	CONSTRAINT `bde_budget_forecasts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bde_fiscal_years` (
	`id` int AUTO_INCREMENT NOT NULL,
	`label` varchar(40) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`is_current` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bde_fiscal_years_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bde_financial_entries` ADD `accounting_account_id` int;--> statement-breakpoint
ALTER TABLE `bde_financial_entries` ADD `bank_account_id` int;--> statement-breakpoint
ALTER TABLE `bde_financial_entries` ADD `fiscal_year_id` int;--> statement-breakpoint
ALTER TABLE `bde_budget_forecasts` ADD CONSTRAINT `bde_budget_forecasts_fiscal_year_id_bde_fiscal_years_id_fk` FOREIGN KEY (`fiscal_year_id`) REFERENCES `bde_fiscal_years`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_budget_forecasts` ADD CONSTRAINT `bde_budget_forecasts_accounting_account_id_bde_accounting_accounts_id_fk` FOREIGN KEY (`accounting_account_id`) REFERENCES `bde_accounting_accounts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bde_budget_fy_idx` ON `bde_budget_forecasts` (`fiscal_year_id`);--> statement-breakpoint
ALTER TABLE `bde_financial_entries` ADD CONSTRAINT `bde_financial_entries_accounting_account_id_bde_accounting_accounts_id_fk` FOREIGN KEY (`accounting_account_id`) REFERENCES `bde_accounting_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_financial_entries` ADD CONSTRAINT `bde_financial_entries_bank_account_id_bde_bank_accounts_id_fk` FOREIGN KEY (`bank_account_id`) REFERENCES `bde_bank_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bde_financial_entries` ADD CONSTRAINT `bde_financial_entries_fiscal_year_id_bde_fiscal_years_id_fk` FOREIGN KEY (`fiscal_year_id`) REFERENCES `bde_fiscal_years`(`id`) ON DELETE set null ON UPDATE no action;