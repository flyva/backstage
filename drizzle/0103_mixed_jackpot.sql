CREATE TABLE `inventory_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`warehouse_id` int NOT NULL,
	`code` varchar(40) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `inventory_locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `inv_location_code_idx` UNIQUE(`warehouse_id`,`code`)
);
--> statement-breakpoint
CREATE TABLE `inventory_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barcode` varchar(64),
	`label` varchar(200) NOT NULL,
	`has_expiry` boolean NOT NULL DEFAULT false,
	`low_stock_threshold` int,
	`default_location_id` int,
	`created_at` datetime NOT NULL,
	CONSTRAINT `inventory_products_id` PRIMARY KEY(`id`),
	CONSTRAINT `inventory_products_barcode_unique` UNIQUE(`barcode`)
);
--> statement-breakpoint
CREATE TABLE `inventory_stock_lots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int NOT NULL,
	`location_id` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 0,
	`expires_on` date,
	`created_at` datetime NOT NULL,
	CONSTRAINT `inventory_stock_lots_id` PRIMARY KEY(`id`),
	CONSTRAINT `inv_lot_unique_idx` UNIQUE(`product_id`,`location_id`,`expires_on`)
);
--> statement-breakpoint
CREATE TABLE `inventory_warehouses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `inventory_warehouses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `roles` ADD `perm_inventaire` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `roles` ADD `view_inventaire` boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `inventory_locations` ADD CONSTRAINT `inventory_locations_warehouse_id_inventory_warehouses_id_fk` FOREIGN KEY (`warehouse_id`) REFERENCES `inventory_warehouses`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_products` ADD CONSTRAINT `inventory_products_default_location_id_inventory_locations_id_fk` FOREIGN KEY (`default_location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_stock_lots` ADD CONSTRAINT `inventory_stock_lots_product_id_inventory_products_id_fk` FOREIGN KEY (`product_id`) REFERENCES `inventory_products`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inventory_stock_lots` ADD CONSTRAINT `inventory_stock_lots_location_id_inventory_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `inventory_locations`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inv_lot_product_idx` ON `inventory_stock_lots` (`product_id`);