ALTER TABLE `ticket_files` ADD `comment_id` int;--> statement-breakpoint
ALTER TABLE `ticket_files` ADD CONSTRAINT `ticket_files_comment_id_ticket_comments_id_fk` FOREIGN KEY (`comment_id`) REFERENCES `ticket_comments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tf_comment_idx` ON `ticket_files` (`comment_id`);