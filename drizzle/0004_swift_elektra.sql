CREATE TABLE `user_awards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`awardId` varchar(64) NOT NULL,
	`awardName` varchar(128) NOT NULL,
	`awardDescription` text,
	`awardIcon` varchar(128),
	`unlockedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `user_awards_id` PRIMARY KEY(`id`)
);
