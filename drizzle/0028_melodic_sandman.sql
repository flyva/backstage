CREATE TABLE `contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`group_name` varchar(80) NOT NULL,
	`name` varchar(120) NOT NULL,
	`role` varchar(160),
	`email` varchar(190),
	`phone` varchar(30),
	`note` varchar(300),
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `contacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `contact_group_idx` ON `contacts` (`group_name`,`position`);