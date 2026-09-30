CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(60) NOT NULL,
	`key` varchar(20),
	`description` varchar(200),
	`is_admin` boolean NOT NULL DEFAULT false,
	`perm_administration` boolean NOT NULL DEFAULT false,
	`perm_materiel` boolean NOT NULL DEFAULT false,
	`perm_bde` boolean NOT NULL DEFAULT false,
	`perm_actus` boolean NOT NULL DEFAULT false,
	`perm_galerie` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`),
	CONSTRAINT `roles_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `status` enum('active','pending','disabled') NOT NULL DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `users` ADD `role_id` int;--> statement-breakpoint
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO `roles` (`name`, `key`, `description`, `is_admin`, `perm_administration`, `perm_materiel`, `perm_bde`, `perm_actus`, `perm_galerie`, `created_at`) VALUES
('Administrateur', 'admin', 'Accès complet à tout Backstage', 1, 1, 1, 1, 1, 1, NOW()),
('Référent matériel', 'materiel', 'Gère l''inventaire et les prêts de matériel', 0, 0, 1, 0, 0, 0, NOW()),
('BDE', 'bde', 'Publie pour le BDE, les actus et la galerie', 0, 0, 0, 1, 1, 1, NOW()),
('Membre', 'member', 'Accès normal, sans droit de gestion', 0, 0, 0, 0, 0, 0, NOW());
--> statement-breakpoint
UPDATE `users` SET `role_id` = (SELECT `id` FROM `roles` WHERE `roles`.`key` = `users`.`role`);
