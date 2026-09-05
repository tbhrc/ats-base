-- Additive side table owned by the adapter service, not OpenCATS core.
-- Holds the genuine per-submission schema gaps identified against
-- tbhrc/recruitment#16 Section 5 (fields 24-27: Next Action, Next Action
-- Date, Owner, Notes) that OpenCATS's native extra_field system cannot
-- express, since its data_item_type only covers Candidate/Company/Contact/
-- JobOrder, not the Candidate x JobOrder submission itself. `candidate_
-- joborder` natively has `added_by` (who created the row) but nothing for
-- "who owns this application right now", which per Section 3's key rule
-- ("Each Candidate x Vacancy application has its own stage, next action,
-- owner and outcome") must live on the submission, not just on Candidate.
--
-- Deliberately NOT a modification of any core OpenCATS table, so upstream
-- schema updates stay clean to pull.

CREATE TABLE IF NOT EXISTS `tb_submission_meta` (
  `candidate_joborder_id` INT(11) NOT NULL,
  `next_action` VARCHAR(255) COLLATE utf8mb4_unicode_ci,
  `next_action_date` DATE,
  `owner_id` INT(11),
  `notes` TEXT COLLATE utf8mb4_unicode_ci,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`candidate_joborder_id`),
  CONSTRAINT `fk_tb_submission_meta_candidate_joborder`
    FOREIGN KEY (`candidate_joborder_id`)
    REFERENCES `candidate_joborder` (`candidate_joborder_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
