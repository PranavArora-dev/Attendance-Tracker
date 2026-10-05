'use strict';
const router = require('express').Router();
const { query } = require('../db/pool');
const { authorize } = require('../middleware/auth');
const { iso, pct, wrap } = require('../utils/helpers');

router.get('/', authorize(['teacher']), wrap(async (req, res) => {
  const cls = String(req.query.class || ''), sub = String(req.query.subject || '');
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
  const since = iso(new Date(Date.now() - days * 86400e3));

  const { rows } = await query(
    `SELECT u.roll_no AS "rollNo", u.name, COUNT(a.status)::int AS total,
            (COUNT(a.status) FILTER (WHERE a.status='P'))::int AS present
     FROM users u
     JOIN sections s ON s.id=u.section_id AND s.name=$1
     LEFT JOIN attendance a ON a.student_id=u.id AND a.date>=$2 AND a.class_id IN
       (SELECT c.id FROM classes c JOIN subjects sb ON sb.id=c.subject_id
        WHERE c.teacher_id=$3 AND ($4::text='' OR sb.name=$4::text))
     WHERE u.role='student' GROUP BY u.id ORDER BY u.roll_no`, [cls, since, req.user.id, sub]);

  const out = rows.map((r) => ({ rollNo: r.rollNo, name: r.name, total: r.total, present: r.present, pct: pct(r.present, r.total) }));
  const tot = out.reduce((a, r) => a + r.total, 0), pres = out.reduce((a, r) => a + r.present, 0);
  res.json({ avg: pct(pres, tot), count: out.length, low: out.filter((r) => r.total > 0 && r.pct < 75).length, rows: out });
}));

module.exports = router;
