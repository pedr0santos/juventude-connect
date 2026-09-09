CREATE TABLE `discipulator_responsibles` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(180) NOT NULL,
  `active` enum('yes','no') NOT NULL DEFAULT 'yes',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `discipulator_responsibles_id` PRIMARY KEY(`id`),
  CONSTRAINT `discipulator_responsibles_name_unique` UNIQUE(`name`)
);
ALTER TABLE `discipulators` ADD `responsibleId` int;
INSERT INTO `discipulator_responsibles` (`name`) VALUES ('Mateus Damasceno'), ('Anna Carolina'), ('Rafael Antônio'), ('Gabriel Silva');