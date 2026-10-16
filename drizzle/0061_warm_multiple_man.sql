CREATE TABLE `power_feeders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`circuit_id` int NOT NULL,
	`name` varchar(60) NOT NULL,
	`outlet_count` int,
	`position` int NOT NULL DEFAULT 0,
	CONSTRAINT `power_feeders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `power_items` ADD `feeder_id` int;--> statement-breakpoint
ALTER TABLE `power_feeders` ADD CONSTRAINT `power_feeders_circuit_id_power_circuits_id_fk` FOREIGN KEY (`circuit_id`) REFERENCES `power_circuits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `pf_circuit_idx` ON `power_feeders` (`circuit_id`);--> statement-breakpoint
ALTER TABLE `power_items` ADD CONSTRAINT `power_items_feeder_id_power_feeders_id_fk` FOREIGN KEY (`feeder_id`) REFERENCES `power_feeders`(`id`) ON DELETE set null ON UPDATE no action;