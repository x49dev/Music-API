CREATE TABLE `artists` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text(255) NOT NULL,
	`provider` text(50) NOT NULL,
	`name` text(500) NOT NULL,
	`description` text(5000),
	`thumbnail` text(1000),
	`subscriber_count` integer,
	`video_count` integer,
	`web_url` text(1000),
	`metadata` text,
	`cached_at` integer,
	`expires_at` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artists_provider_id_provider_unique` ON `artists` (`provider_id`,`provider`);--> statement-breakpoint
CREATE INDEX `artists_expires_at_idx` ON `artists` (`expires_at`);--> statement-breakpoint
CREATE TABLE `playlists` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text(255) NOT NULL,
	`provider` text(50) NOT NULL,
	`title` text(500) NOT NULL,
	`description` text(5000),
	`creator` text(500),
	`creator_id` text(255),
	`thumbnail` text(1000),
	`track_count` integer,
	`duration` integer,
	`web_url` text(1000),
	`tracks` text,
	`metadata` text,
	`cached_at` integer,
	`expires_at` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `playlists_provider_id_provider_unique` ON `playlists` (`provider_id`,`provider`);--> statement-breakpoint
CREATE INDEX `playlists_creator_id_idx` ON `playlists` (`creator_id`);--> statement-breakpoint
CREATE INDEX `playlists_expires_at_idx` ON `playlists` (`expires_at`);--> statement-breakpoint
CREATE TABLE `searches` (
	`id` text PRIMARY KEY NOT NULL,
	`query` text(500) NOT NULL,
	`type` text(50) NOT NULL,
	`results` text,
	`result_count` integer,
	`cached_at` integer,
	`expires_at` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `searches_query_type_unique` ON `searches` (`query`,`type`);--> statement-breakpoint
CREATE INDEX `searches_expires_at_idx` ON `searches` (`expires_at`);--> statement-breakpoint
CREATE TABLE `tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text(255) NOT NULL,
	`provider` text(50) NOT NULL,
	`title` text(500) NOT NULL,
	`artist` text(500),
	`artist_id` text(255),
	`album` text(500),
	`album_id` text(255),
	`duration` integer,
	`thumbnail` text(1000),
	`web_url` text(1000),
	`metadata` text,
	`cached_at` integer,
	`expires_at` integer,
	`created_at` integer,
	`updated_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tracks_provider_id_provider_unique` ON `tracks` (`provider_id`,`provider`);--> statement-breakpoint
CREATE INDEX `tracks_artist_id_idx` ON `tracks` (`artist_id`);--> statement-breakpoint
CREATE INDEX `tracks_expires_at_idx` ON `tracks` (`expires_at`);