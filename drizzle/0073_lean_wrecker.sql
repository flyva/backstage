CREATE TABLE `detente_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`game` varchar(30) NOT NULL DEFAULT 'tetris',
	`score` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `detente_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `roles` ADD `view_detente` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `detente_scores` ADD CONSTRAINT `detente_scores_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ds_game_score_idx` ON `detente_scores` (`game`,`score`);--> statement-breakpoint
CREATE INDEX `ds_user_idx` ON `detente_scores` (`user_id`);