ALTER TABLE `users` ADD `resto_max_day_cents` int;--> statement-breakpoint
ALTER TABLE `users` ADD `resto_max_meal_cents` int;--> statement-breakpoint
ALTER TABLE `users` ADD `resto_tr_cents` int;--> statement-breakpoint
ALTER TABLE `users` ADD `resto_tr_moment` enum('midi','soir','les_deux') DEFAULT 'midi' NOT NULL;