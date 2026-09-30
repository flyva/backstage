CREATE TABLE `checklist_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(150) NOT NULL,
	`items` text NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `checklist_templates_id` PRIMARY KEY(`id`)
);
