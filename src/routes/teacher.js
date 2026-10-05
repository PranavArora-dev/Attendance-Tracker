'use strict';
const router = require('express').Router();
const { query } = require('../db/pool');
const { authorize } = require('../middleware/auth');
const { iso, pct, ago, wrap } = require('../utils/helpers');
const { classesFor, publicClass } = require('../utils/classes');

router.get('/dashboard', authorize(['teacher']), wrap(async (req, res) => {
  const user = req.user, today = iso(new Date());
  const cls = await classesFor(user);

  const students = (await query(
    `SELECT COUNT(DISTINCT u.id)::int AS n FROM users u JOIN classes c ON c.section_id=u.section_id
     WHERE c.teacher_id=$1 AND u.role='student'`, [user.id])).rows[0].n;

  const since = iso(new Date(Date.now() - 30 * 86400e3));
  const day = (await query(
    `SELECT COUNT(*)::int AS n, (COUNT(*) FILTER (WHERE a.status='P'))::int AS p
     FROM attendance a JOIN classes c ON c.id=a.class_id WHERE c.teacher_id=$1 AND a.date>=$2`, [user.id, since])).rows[0];

  const pending = (await query(
    `SELECT COUNT(*)::int AS n FROM classes c WHERE c.teacher_id=$1
     AND NOT EXISTS (SELECT 1 FROM attendance a WHERE a.class_id=c.id AND a.date=$2)`, [user.id, today])).rows[0].n;

  /* Mon..Sat of this (or last) week, one query grouped by date */
  const now = new Date();
  const mon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),
    now.getUTCDate() - ((now.getUTCDay() + 6) % 7) - (req.query.range === 'last' ? 7 : 0)));
  const dayList = [0, 1, 2, 3, 4, 5].map((i) => iso(new Date(mon.getTime() + i * 86400e3)));
  const wk = (await query(
    `SELECT a.date, COUNT(*)::int AS n, (COUNT(*) FILTER (WHERE a.status='P'))::int AS p
     FROM attendance a JOIN classes c ON c.id=a.class_id
     WHERE c.teacher_id=$1 AND a.date BETWEEN $2 AND $3 GROUP BY a.date`, [user.id, dayList[0], dayList[5]])).rows;
  const byDate = new Map(wk.map((r) => [r.date, r]));
  const week = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => {
    const r = byDate.get(dayList[i]) || { n: 0, p: 0 };
    return { day: d, pct: pct(r.p, r.n) };
  });

  const activity = (await query(
    'SELECT type, text, created_at FROM activity WHERE user_id=$1 ORDER BY created_at DESC LIMIT 5', [user.id])).rows
    .map((a) => ({ type: a.type, text: a.text, time: ago(a.created_at) }));

  res.json({
    stats: { classes: cls.length, students, avg: pct(day.p, day.n), pending },
    today: cls.map(publicClass), week, activity,
  });
}));

module.exports = router;
