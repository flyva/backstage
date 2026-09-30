CREATE TABLE `pending_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(190) NOT NULL,
	`first_name` varchar(60) NOT NULL,
	`last_name` varchar(60) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`token_hash` varchar(64) NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `pending_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `pending_registrations_email_unique` UNIQUE(`email`),
	CONSTRAINT `pending_registrations_token_hash_unique` UNIQUE(`token_hash`)
);
