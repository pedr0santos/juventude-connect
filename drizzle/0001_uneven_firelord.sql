CREATE TABLE `app_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`birthdayTemplate` text NOT NULL,
	`absenceTemplate` text NOT NULL,
	`whatsappPhoneNumberId` varchar(120),
	`whatsappBusinessAccountId` varchar(120),
	`whatsappToken` text,
	`whatsappEnabled` enum('enabled','disabled') NOT NULL DEFAULT 'disabled',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `app_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `attendance` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventId` int NOT NULL,
	`youthId` int NOT NULL,
	`status` enum('present','absent') NOT NULL,
	`recordedAt` timestamp NOT NULL DEFAULT (now()),
	`correctedAt` timestamp,
	CONSTRAINT `attendance_id` PRIMARY KEY(`id`),
	CONSTRAINT `attendance_event_youth_unique` UNIQUE(`eventId`,`youthId`)
);
--> statement-breakpoint
CREATE TABLE `discipleship_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`youthId` int NOT NULL,
	`discipulatorId` int NOT NULL,
	`startedAt` date NOT NULL,
	`endedAt` date,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `discipleship_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discipulators` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`whatsapp` varchar(32) NOT NULL,
	`status` enum('active','inactive') NOT NULL DEFAULT 'active',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `discipulators_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attendanceId` int NOT NULL,
	`youthId` int NOT NULL,
	`discipulatorId` int NOT NULL,
	`status` enum('pending','contacted','talked','justification','resolved') NOT NULL DEFAULT 'pending',
	`notes` text,
	`lastContactAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `follow_ups_id` PRIMARY KEY(`id`),
	CONSTRAINT `follow_ups_attendanceId_unique` UNIQUE(`attendanceId`)
);
--> statement-breakpoint
CREATE TABLE `message_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`youthId` int,
	`discipulatorId` int,
	`messageType` enum('birthday','absence') NOT NULL,
	`referenceKey` varchar(180) NOT NULL,
	`recipient` varchar(32) NOT NULL,
	`body` text NOT NULL,
	`status` enum('pending','sent','failed','test') NOT NULL DEFAULT 'pending',
	`providerMessageId` varchar(255),
	`error` text,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `message_logs_id` PRIMARY KEY(`id`),
	CONSTRAINT `message_reference_unique` UNIQUE(`messageType`,`referenceKey`)
);
--> statement-breakpoint
CREATE TABLE `worship_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventDate` date NOT NULL,
	`eventType` varchar(120) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `worship_events_id` PRIMARY KEY(`id`),
	CONSTRAINT `worship_event_date_type_unique` UNIQUE(`eventDate`,`eventType`)
);
--> statement-breakpoint
CREATE TABLE `youths` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(180) NOT NULL,
	`birthDate` date NOT NULL,
	`whatsapp` varchar(32) NOT NULL,
	`address` varchar(255),
	`photoUrl` text,
	`notes` text,
	`discipulatorId` int NOT NULL,
	`discipleshipStartDate` date NOT NULL,
	`relationshipStatus` enum('active','inactive') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `youths_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','discipulator') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `users` ADD `discipulatorId` int;--> statement-breakpoint
CREATE INDEX `attendance_youth_idx` ON `attendance` (`youthId`);--> statement-breakpoint
CREATE INDEX `history_youth_idx` ON `discipleship_history` (`youthId`);--> statement-breakpoint
CREATE INDEX `discipulators_name_idx` ON `discipulators` (`name`);--> statement-breakpoint
CREATE INDEX `follow_up_status_idx` ON `follow_ups` (`status`);--> statement-breakpoint
CREATE INDEX `follow_up_youth_idx` ON `follow_ups` (`youthId`);--> statement-breakpoint
CREATE INDEX `messages_created_idx` ON `message_logs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `youths_birth_date_idx` ON `youths` (`birthDate`);--> statement-breakpoint
CREATE INDEX `youths_discipulator_idx` ON `youths` (`discipulatorId`);