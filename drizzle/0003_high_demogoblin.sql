ALTER TABLE `email_users` ADD `stripeCustomerId` varchar(64);--> statement-breakpoint
ALTER TABLE `email_users` ADD `stripeSubscriptionId` varchar(64);--> statement-breakpoint
ALTER TABLE `email_users` ADD `stripePriceId` varchar(64);--> statement-breakpoint
ALTER TABLE `email_users` ADD `stripeSubscriptionStatus` varchar(32);--> statement-breakpoint
ALTER TABLE `email_users` ADD `stripeTrialEnd` timestamp;