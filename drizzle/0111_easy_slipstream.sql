DROP TABLE `pending_email_verifications`;--> statement-breakpoint
ALTER TABLE `users` DROP INDEX `users_institutional_email_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `institutional_email`;