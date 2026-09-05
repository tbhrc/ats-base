const express = require('express');
const { pool } = require('./db');
const { logAudit } = require('./audit');

const router = express.Router();

// -- helpers ---------------------------------------------------------------

function recordId(prefix, id) {
  return `${prefix}-${id}`;
}

async function loadExtraFields(dataItemType, dataItemId) {
  const [rows] = await pool.execute(
    'SELECT field_name, value FROM extra_field WHERE data_item_type = :t AND data_item_id = :id',
    { t: dataItemType, id: dataItemId }
  );
  const out = {};
  for (const r of rows) out[r.field_name] = r.value;
  return out;
}

async function upsertExtraField(dataItemType, dataItemId, fieldName, value) {
  const [existing] = await pool.execute(
    'SELECT extra_field_id FROM extra_field WHERE data_item_type = :t AND data_item_id = :id AND field_name = :fn',
    { t: dataItemType, id: dataItemId, fn: fieldName }
  );
  if (existing.length > 0) {
    await pool.execute('UPDATE extra_field SET value = :v WHERE extra_field_id = :id', {
      v: value,
      id: existing[0].extra_field_id,
    });
  } else {
    await pool.execute(
      'INSERT INTO extra_field (data_item_id, field_name, value, data_item_type) VALUES (:id, :fn, :v, :t)',
      { id: dataItemId, fn: fieldName, v: value, t: dataItemType }
    );
  }
}

const DATA_ITEM_CANDIDATE = 100;

// -- Job Orders (vacancies) --------------------------------------------------

// List vacancies/job orders.
router.get('/joborders', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT j.joborder_id, j.title, j.status, j.company_id, c.name AS client_name, j.date_created
     FROM joborder j JOIN company c ON c.company_id = j.company_id
     ORDER BY j.date_created DESC LIMIT 200`
  );
  res.json(rows.map((r) => ({ ...r, record_id: recordId('JO', r.joborder_id) })));
});

// Fetch one vacancy by stable id.
router.get('/joborders/:id', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT j.*, c.name AS client_name FROM joborder j JOIN company c ON c.company_id = j.company_id
     WHERE j.joborder_id = :id`,
    { id: req.params.id }
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Job order not found' });
  res.json({ ...rows[0], record_id: recordId('JO', rows[0].joborder_id) });
});

// List candidates/submissions for one vacancy.
router.get('/joborders/:id/candidates', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT cj.candidate_joborder_id, cj.status AS status_id, s.short_description AS stage,
            cj.date_created, cj.date_modified,
            cand.candidate_id, cand.first_name, cand.last_name, cand.email1, cand.source,
            m.next_action, m.next_action_date, m.owner_id, m.notes
     FROM candidate_joborder cj
     JOIN candidate cand ON cand.candidate_id = cj.candidate_id
     JOIN candidate_joborder_status s ON s.candidate_joborder_status_id = cj.status
     LEFT JOIN tb_submission_meta m ON m.candidate_joborder_id = cj.candidate_joborder_id
     WHERE cj.joborder_id = :id
     ORDER BY cj.date_modified DESC`,
    { id: req.params.id }
  );
  res.json(rows.map((r) => ({ ...r, record_id: recordId('SUB', r.candidate_joborder_id) })));
});

// -- Candidates --------------------------------------------------------------

router.get('/candidates/:id', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM candidate WHERE candidate_id = :id', { id: req.params.id });
  if (rows.length === 0) return res.status(404).json({ error: 'Candidate not found' });
  const extra = await loadExtraFields(DATA_ITEM_CANDIDATE, rows[0].candidate_id);
  res.json({ ...rows[0], record_id: recordId('CAND', rows[0].candidate_id), extra_fields: extra });
});

// Create a candidate. source_ref / source_profile_url / source_candidate_id
// (Section 5 fields 29-31) are stored as native OpenCATS custom fields on
// the Candidate (Section 5's own gap-handling rule: native field where it
// exists -- `source` -- custom fields for the rest).
router.post('/candidates', async (req, res) => {
  const {
    firstName, lastName, email, phone, source, sourceRef, sourceProfileUrl, sourceCandidateId, notes,
    city, country, currentEmployer, desiredPay, currentPay, extraFields,
  } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'firstName and lastName are required' });

  const [result] = await pool.execute(
    `INSERT INTO candidate (first_name, last_name, email1, phone_cell, source, notes, city, country, current_employer, desired_pay, current_pay, date_created, date_modified, entered_by)
     VALUES (:firstName, :lastName, :email, :phone, :source, :notes, :city, :country, :currentEmployer, :desiredPay, :currentPay, NOW(), NOW(), 0)`,
    {
      firstName, lastName, email: email || null, phone: phone || null, source: source || null, notes: notes || null,
      city: city || null, country: country || null, currentEmployer: currentEmployer || null,
      desiredPay: desiredPay || null, currentPay: currentPay || null,
    }
  );
  const candidateId = result.insertId;

  if (sourceRef) await upsertExtraField(DATA_ITEM_CANDIDATE, candidateId, 'source_ref', sourceRef);
  if (sourceProfileUrl) await upsertExtraField(DATA_ITEM_CANDIDATE, candidateId, 'source_profile_url', sourceProfileUrl);
  if (sourceCandidateId) await upsertExtraField(DATA_ITEM_CANDIDATE, candidateId, 'source_candidate_id', sourceCandidateId);
  if (extraFields && typeof extraFields === 'object') {
    for (const [key, value] of Object.entries(extraFields)) {
      if (value !== undefined && value !== null && value !== '') {
        await upsertExtraField(DATA_ITEM_CANDIDATE, candidateId, key, String(value));
      }
    }
  }

  await logAudit(req.actor, 'create', 'candidate', candidateId, req.body);
  res.status(201).json({ candidateId, record_id: recordId('CAND', candidateId) });
});

// -- Submissions (Candidate x Job Order application) -------------------------

router.get('/submissions/:id', async (req, res) => {
  const [rows] = await pool.execute(
    `SELECT cj.*, s.short_description AS stage,
            m.next_action, m.next_action_date, m.owner_id, m.notes
     FROM candidate_joborder cj
     JOIN candidate_joborder_status s ON s.candidate_joborder_status_id = cj.status
     LEFT JOIN tb_submission_meta m ON m.candidate_joborder_id = cj.candidate_joborder_id
     WHERE cj.candidate_joborder_id = :id`,
    { id: req.params.id }
  );
  if (rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
  res.json({ ...rows[0], record_id: recordId('SUB', rows[0].candidate_joborder_id) });
});

// Create a submission (Candidate x Job Order application). Duplicate
// candidate+job applications are rejected -- one candidate, one application
// per vacancy; re-apply by updating the existing submission instead.
router.post('/submissions', async (req, res) => {
  const { candidateId, jobOrderId } = req.body;
  if (!candidateId || !jobOrderId) return res.status(400).json({ error: 'candidateId and jobOrderId are required' });

  const [dupe] = await pool.execute(
    'SELECT candidate_joborder_id FROM candidate_joborder WHERE candidate_id = :c AND joborder_id = :j',
    { c: candidateId, j: jobOrderId }
  );
  if (dupe.length > 0) {
    return res.status(409).json({ error: 'A submission already exists for this candidate and job order', candidate_joborder_id: dupe[0].candidate_joborder_id });
  }

  const [result] = await pool.execute(
    `INSERT INTO candidate_joborder (candidate_id, joborder_id, status, date_created, date_modified, added_by)
     VALUES (:c, :j, 10, NOW(), NOW(), 0)`,
    { c: candidateId, j: jobOrderId }
  );
  await logAudit(req.actor, 'create', 'submission', result.insertId, req.body);
  res.status(201).json({ candidateJoborderId: result.insertId, record_id: recordId('SUB', result.insertId) });
});

// Update stage / next action / owner / notes on one submission. Every field
// is optional; only the fields present in the body are changed.
router.patch('/submissions/:id', async (req, res) => {
  const id = req.params.id;
  const [existing] = await pool.execute('SELECT candidate_joborder_id FROM candidate_joborder WHERE candidate_joborder_id = :id', { id });
  if (existing.length === 0) return res.status(404).json({ error: 'Submission not found' });

  const { statusId, nextAction, nextActionDate, ownerId, notes } = req.body;

  if (statusId !== undefined) {
    const [validStatus] = await pool.execute('SELECT 1 FROM candidate_joborder_status WHERE candidate_joborder_status_id = :s', { s: statusId });
    if (validStatus.length === 0) return res.status(400).json({ error: `Unknown statusId ${statusId}` });
    await pool.execute('UPDATE candidate_joborder SET status = :s, date_modified = NOW() WHERE candidate_joborder_id = :id', { s: statusId, id });
  }

  const hasNextAction = 'nextAction' in req.body;
  const hasNextActionDate = 'nextActionDate' in req.body;
  const hasOwnerId = 'ownerId' in req.body;
  const hasNotes = 'notes' in req.body;

  if (hasNextAction || hasNextActionDate || hasOwnerId || hasNotes) {
    // A field explicitly set to null must clear it; COALESCE cannot express
    // that (it would silently keep the old value), so fields omitted from
    // the body fall back to the current row instead of relying on COALESCE.
    const [existingMeta] = await pool.execute(
      'SELECT next_action, next_action_date, owner_id, notes FROM tb_submission_meta WHERE candidate_joborder_id = :id',
      { id }
    );
    const old = existingMeta[0] || {};

    const nextActionVal = hasNextAction ? nextAction ?? null : old.next_action ?? null;
    const nextActionDateVal = hasNextActionDate ? nextActionDate ?? null : old.next_action_date ?? null;
    const ownerIdVal = hasOwnerId ? ownerId ?? null : old.owner_id ?? null;
    const notesVal = hasNotes ? notes ?? null : old.notes ?? null;

    await pool.execute(
      `INSERT INTO tb_submission_meta (candidate_joborder_id, next_action, next_action_date, owner_id, notes)
       VALUES (:id, :nextAction, :nextActionDate, :ownerId, :notes)
       ON DUPLICATE KEY UPDATE
         next_action = :nextAction,
         next_action_date = :nextActionDate,
         owner_id = :ownerId,
         notes = :notes`,
      {
        id,
        nextAction: nextActionVal,
        nextActionDate: nextActionDateVal,
        ownerId: ownerIdVal,
        notes: notesVal,
      }
    );
  }

  await logAudit(req.actor, 'update', 'submission', id, req.body);
  res.json({ ok: true, record_id: recordId('SUB', id) });
});

// Safely archive/not-select without deleting history: sets stage to
// "Not Selected" (id 120, see db-init/02-talent_bridge_stages.sql) rather
// than removing the row, preserving candidate_joborder_status_history.
router.post('/submissions/:id/archive', async (req, res) => {
  const id = req.params.id;
  const [existing] = await pool.execute('SELECT candidate_joborder_id FROM candidate_joborder WHERE candidate_joborder_id = :id', { id });
  if (existing.length === 0) return res.status(404).json({ error: 'Submission not found' });
  await pool.execute('UPDATE candidate_joborder SET status = 120, date_modified = NOW() WHERE candidate_joborder_id = :id', { id });
  await logAudit(req.actor, 'archive', 'submission', id, {});
  res.json({ ok: true, record_id: recordId('SUB', id), status: 'Not Selected' });
});

module.exports = router;
