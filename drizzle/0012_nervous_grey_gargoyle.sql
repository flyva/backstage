ALTER TABLE `users` ADD `ms_oid` varchar(80);--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_ms_oid_unique` UNIQUE(`ms_oid`);