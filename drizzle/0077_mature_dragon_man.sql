CREATE TABLE `page_stats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`path` varchar(255) NOT NULL,
	`device` enum('mobile','desktop') NOT NULL,
	`visits` int NOT NULL DEFAULT 0,
	`last_visit_at` datetime NOT NULL,
	CONSTRAINT `page_stats_id` PRIMARY KEY(`id`),
	CONSTRAINT `page_stats_path_device_idx` UNIQUE(`path`,`device`)
);
