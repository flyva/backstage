CREATE TABLE `cues` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` int NOT NULL,
	`position` int NOT NULL DEFAULT 0,
	`number` varchar(20),
	`title` varchar(200) NOT NULL,
	`category` enum('lumiere','son','video','plateau','regie','autre') NOT NULL DEFAULT 'lumiere',
	`duration_sec` int,
	`notes` text,
	CONSTRAINT `cues_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `cues` ADD CONSTRAINT `cues_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `cue_project_idx` ON `cues` (`project_id`,`position`);