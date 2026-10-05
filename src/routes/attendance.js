'use strict';
const router = require('express').Router();
const { query, tx } = require('../db/pool');
const { authorize } = require('../middleware/auth');
const { bad, validDate, wrap } = require('../utils/helpers');
const { ownClass } = require('../utils/classes');

router.get('/:id/attendance', authorize(['teacher']), wrap(async (req, res) => {
  const c = await ownClass(req.user, req.params.id), date = validDate(req.query.date);
  const saved = new Map((await query('SELECT student_id, status FROM attendance WHERE class_id=$1 AND date=$2', [c.id, date]))
    .rows.map((r) => [r.student_id, r.status]));
  const { rows } = await query(`SELECT id, roll_no, name FROM users WHERE role='student' AND section_id=$1 ORDER BY roll_no`, [c.section_id]);
  res.json(rows.map((s) => ({ studentId: s.id, rollNo: s.roll_no, name: s.name, status: saved.get(s.id) || 'P' })));
}));

router.post('/:id/attendance', authorize(['teacher']), wrap(async (req, res) => {
  const user = req.user, body = req.body || {};
  const c = await ownClass(user, req.params.id), date = validDate(body.date), recs = body.records;
  if (!Array.isArray(recs) || !recs.length || recs.length > 500) throw bad('Send the attendance records to save.');

  const ok = new Set((await query(`SELECT id FROM users WHERE role='student' AND section_id=$1`, [c.section_id])).rows.map((r) => r.id));
  for (const r of recs) {
    if (!ok.has(+r.studentId)) throw bad('One of the students does not belong to this class.');
    if (r.status !== 'P' && r.status !== 'A') throw bad('Status must be P (present) or A (absent).');
  }

  await tx(async (client) => {
    await client.query(
      `INSERT INTO attendance(class_id,student_id,date,status)
       SELECT $1, sid, $2::date, st FROM unnest($3::int[], $4::char[]) AS t(sid, st)
       ON CONFLICT (class_id, student_id, date) DO UPDATE SET status = EXCLUDED.status`,
      [c.id, date, recs.map((r) => +r.studentId), recs.map((r) => r.status)]);
    await client.query('INSERT INTO activity(user_id,type,text) VALUES($1,$2,$3)',
      [user.id, 'check', `You marked attendance for ${c.subject}`]);
  });
  res.json({ ok: true, saved: recs.length });
}));

module.exports = router;
