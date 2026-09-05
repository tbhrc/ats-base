-- Replace OpenCATS's 12 generic candidate_joborder_status rows with the 16
-- Talent Bridge recruitment stages (tbhrc/recruitment#16, Section 4).
-- Existing candidate_joborder rows referencing old status ids are moved to
-- the closest equivalent new stage before the old rows are removed, so no
-- submission silently loses its state.

START TRANSACTION;

-- Add the new stage rows first (ids chosen to leave room between them).
INSERT INTO `candidate_joborder_status`
  (`candidate_joborder_status_id`, `short_description`, `can_be_scheduled`, `triggers_email`, `is_enabled`)
VALUES
  (10, 'New Candidates', 0, 0, 1),
  (20, 'Maybe', 0, 0, 1),
  (30, 'Longlist/Questionnaire', 0, 0, 1),
  (40, 'Questionnaire Answered', 0, 0, 1),
  (50, 'Assessment', 0, 0, 1),
  (60, 'Assessment Completed', 0, 0, 1),
  (70, 'Screening Interview', 1, 0, 1),
  (80, 'Technical Test', 0, 0, 1),
  (90, 'Shortlisted', 0, 0, 1),
  (100, 'Client Submission', 0, 0, 1),
  (110, 'Client Interview', 1, 0, 1),
  (120, 'Not Selected', 0, 0, 1),
  (130, 'Offered', 0, 0, 1),
  (140, 'Hired/Signed', 0, 0, 1),
  (150, 'Started', 0, 0, 1),
  (160, 'Probation Passed', 0, 0, 1)
ON DUPLICATE KEY UPDATE
  `short_description` = VALUES(`short_description`),
  `can_be_scheduled` = VALUES(`can_be_scheduled`),
  `is_enabled` = VALUES(`is_enabled`);

-- Remap any existing submissions off the old default statuses onto the
-- nearest new equivalent (only matters if data was created before this
-- runs; a fresh install has none).
UPDATE `candidate_joborder` SET `status` = 10  WHERE `status` IN (0, 100);      -- No Status / No Contact -> New Candidates
UPDATE `candidate_joborder` SET `status` = 30  WHERE `status` IN (200, 250);     -- Contacted / Responded -> Longlist/Questionnaire
UPDATE `candidate_joborder` SET `status` = 90  WHERE `status` = 300;             -- Qualifying -> Shortlisted
UPDATE `candidate_joborder` SET `status` = 100 WHERE `status` = 400;             -- Submitted -> Client Submission
UPDATE `candidate_joborder` SET `status` = 110 WHERE `status` = 500;             -- Interviewing -> Client Interview
UPDATE `candidate_joborder` SET `status` = 130 WHERE `status` = 600;             -- Offered -> Offered
UPDATE `candidate_joborder` SET `status` = 120 WHERE `status` IN (650, 675, 700);-- Not in Consideration / Declined -> Not Selected
UPDATE `candidate_joborder` SET `status` = 140 WHERE `status` = 800;             -- Placed -> Hired/Signed

-- Now remove the old default stage rows.
DELETE FROM `candidate_joborder_status` WHERE `candidate_joborder_status_id` IN
  (0, 100, 200, 250, 300, 400, 500, 600, 650, 675, 700, 800);

COMMIT;
