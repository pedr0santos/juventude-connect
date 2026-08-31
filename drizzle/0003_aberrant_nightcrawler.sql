CREATE TABLE `absence_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendanceId` int NOT NULL,
	`youthId` int NOT NULL,
	`discipulatorId` int,
	`recipient` varchar(32),
	`body` text NOT NULL,
	`status` enum('pending','sending','sent','error','cancelled') NOT NULL DEFAULT 'pending',
	`providerMessageId` varchar(255),
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`sentAt` timestamp,
	CONSTRAINT `absence_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `absence_notifications_attendanceId_unique` UNIQUE(`attendanceId`)
);
--> statement-breakpoint
CREATE INDEX `absence_notifications_attendance_idx` ON `absence_notifications` (`attendanceId`);--> statement-breakpoint
CREATE INDEX `absence_notifications_status_idx` ON `absence_notifications` (`status`);--> statement-breakpoint
CREATE INDEX `absence_notifications_created_idx` ON `absence_notifications` (`createdAt`);