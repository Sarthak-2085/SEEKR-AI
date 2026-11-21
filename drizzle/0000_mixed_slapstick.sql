CREATE TABLE `bookmarks` (
	`owner` text NOT NULL,
	`key` text NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`created` text NOT NULL,
	PRIMARY KEY(`owner`, `key`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `collections` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	PRIMARY KEY(`owner`, `id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `collection_names` ON `collections` (`owner`,`name`);--> statement-breakpoint
CREATE TABLE `companies` (
	`name` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `follows` (
	`owner` text NOT NULL,
	`topic` text NOT NULL,
	PRIMARY KEY(`owner`, `topic`)
);
--> statement-breakpoint
CREATE TABLE `collection_items` (
	`owner` text NOT NULL,
	`collection` text NOT NULL,
	`key` text NOT NULL,
	PRIMARY KEY(`owner`, `collection`, `key`)
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ingestion_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`time` text NOT NULL,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`detail` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `daily_views` (
	`day` text NOT NULL,
	`tech` text NOT NULL,
	`views` integer NOT NULL,
	PRIMARY KEY(`day`, `tech`)
);
--> statement-breakpoint
CREATE TABLE `news` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`category` text NOT NULL,
	`url` text NOT NULL,
	`record` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_url_unique` ON `news` (`url`);--> statement-breakpoint
CREATE INDEX `news_date_idx` ON `news` (`date`);--> statement-breakpoint
CREATE TABLE `review_queue` (
	`id` text PRIMARY KEY NOT NULL,
	`url` text NOT NULL,
	`record` text NOT NULL,
	`state` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_queue_url_unique` ON `review_queue` (`url`);--> statement-breakpoint
CREATE TABLE `preferences` (
	`owner` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sources` (
	`tech` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	PRIMARY KEY(`tech`, `url`),
	FOREIGN KEY (`tech`) REFERENCES `technologies`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `technologies` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`company` text NOT NULL,
	`category` text NOT NULL,
	`status` text NOT NULL,
	`announced` text,
	`released` text,
	`price_class` text,
	`record` text NOT NULL,
	FOREIGN KEY (`company`) REFERENCES `companies`(`name`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category`) REFERENCES `categories`(`name`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `tech_category_idx` ON `technologies` (`category`);--> statement-breakpoint
CREATE INDEX `tech_release_idx` ON `technologies` (`released`);--> statement-breakpoint
CREATE INDEX `tech_status_idx` ON `technologies` (`status`);