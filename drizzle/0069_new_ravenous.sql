CREATE TABLE `message_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`message_id` int NOT NULL,
	`file` varchar(60) NOT NULL,
	`original_name` varchar(200) NOT NULL,
	`mime` varchar(60) NOT NULL,
	`size` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `message_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `messages` ADD `reply_to_id` int;--> statement-breakpoint
ALTER TABLE `message_attachments` ADD CONSTRAINT `message_attachments_message_id_messages_id_fk` FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ma_message_idx` ON `message_attachments` (`message_id`);