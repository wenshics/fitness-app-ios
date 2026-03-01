CREATE TABLE `email_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `email_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_sessions_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `email_users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`name` text NOT NULL,
	`passwordHash` text NOT NULL,
	`birthday` varchar(20),
	`heightCm` int,
	`weightKg` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_users_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_users_email_unique` UNIQUE(`email`)
);
