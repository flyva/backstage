ALTER TABLE `expense_notes` MODIFY COLUMN `moment` enum('matin','midi','soir','autre') NOT NULL DEFAULT 'midi';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `resto_tr_moment` enum('midi','soir','matin','les_deux','journee_entiere') NOT NULL DEFAULT 'midi';--> statement-breakpoint
ALTER TABLE `users` ADD `resto_autre_cents` int;