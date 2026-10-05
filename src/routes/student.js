'use strict';
const router = require('express').Router();
const { query } = require('../db/pool');
const { authorize } = require('../middleware/auth');
const { pct, ago, niceDate, wrap } = require('../utils/helpers');
const { classesFor } = require('../utils/classes');

router.get('/overview', authorize(['student']), wrap(async (req, res) => {
  const user = req.user, sectionId = user.section_id ?? -1;

  const sections = (await query(
    `SELECT sb.name, COUNT(a.status)::int AS n, (COUNT(a.status) FILTER (WHERE a.status='P'))::int AS p
     FROM classes c JOIN subjects sb ON sb.id=c.subject_id
     LEFT JOIN attendance a ON a.class_id=c.id AND a.student_id=$1
     WHERE c.section_id=$2 GROUP BY c.id, sb.name ORDER BY c.id`, [user.id, sectionId])).rows;
  const total = sections.reduce((a, s) => a + s.n, 0), attended = sections.reduce((a, s) => a + s.p, 0);

  const history = (await query(
    `SELECT a.date, sb.name AS subject, a.status FROM attendance a
     JOIN classes c ON c.id=a.class_id JOIN subjects sb ON sb.id=c.subject_id
     WHERE a.student_id=$1 ORDER BY a.date DESC, c.id LIMIT 20`, [user.id])).rows
    .map((h) => ({ date: niceDate(h.date), subject: h.subject, status: h.status }));

  const cls = await classesFor(user);
  const timetable = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    .map((day) => ({ day, slots: cls.filter((c) => c.days.split(',').includes(day)).map((c) => ({ time: c.time.split(' - ')[0], subject: c.subject })) }))
    .filter((d) => d.slots.length);

  const announcements = (await query('SELECT id, title, text, created_at FROM announcements ORDER BY created_at DESC LIMIT 10')).rows
    .map((a) => ({ id: a.id, title: a.title, text: a.text, ago: ago(a.created_at) }));

  res.json({
    pct: pct(attended, total), attended, total, missed: total - attended,
    subjects: sections.map((s) => ({ name: s.name, pct: pct(s.p, s.n) })),
    announcements, history, timetable,
  });
}));

module.exports = router;
