CREATE TABLE `expense_files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`expense_note_id` int NOT NULL,
	`file_name` varchar(60) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `expense_files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `expense_files` ADD CONSTRAINT `expense_files_expense_note_id_expense_notes_id_fk` FOREIGN KEY (`expense_note_id`) REFERENCES `expense_notes`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `expf_note_idx` ON `expense_files` (`expense_note_id`);