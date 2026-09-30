ALTER TABLE `projects` ADD `personal_of` int;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_personal_of_unique` UNIQUE(`personal_of`);--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_personal_of_users_id_fk` FOREIGN KEY (`personal_of`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;