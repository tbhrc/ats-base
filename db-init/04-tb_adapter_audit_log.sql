-- Every adapter write is logged here for attribution/audit
-- (tbhrc/recruitment#16 Section 11: "Writes must be scoped, authenticated,
-- logged and reconstructable"). Kept separate from OpenCATS's own `history`
-- table since that table's `entered_by` expects a real OpenCATS user_id,
-- and adapter actors (agents/Skills) are not necessarily OpenCATS users.

CREATE TABLE IF NOT EXISTS `tb_adapter_audit_log` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `actor` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL,
  `action` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` INT(11),
  `details` JSON,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_actor` (`actor`),
  KEY `idx_entity` (`entity_type`, `entity_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
