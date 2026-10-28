ALTER TABLE `expense_notes` ADD `extra_comment` text DEFAULT ('') NOT NULL;--> statement-breakpoint
ALTER TABLE `expense_notes` ADD `tva_rate` varchar(10);--> statement-breakpoint
ALTER TABLE `expense_notes` ADD `tva_cents` int;