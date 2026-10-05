'use strict';
/* classes, students, subjects, announcements */
const router = require('express').Router();
const { query } = require('../db/pool');
const { authorize } = require('../middleware/auth');
const { ago, wrap } = require('../utils/helpers');
const { classesFor, publicClass } = require('../utils/classes');

const T = ['teacher'], ANY = ['teacher', 'student'];

router.get('/classes', authorize(ANY), wrap(async (req, res) => {
  res.json((await classesFor(req.user)).map(publicClass));
}));

router.get('/students', authorize(T), wrap(async (req, res) => {
  const { rows } = await query(
    `SELECT DISTINCT u.id, u.roll_no AS "rollNo", u.name, s.name AS "className"
     FROM users u JOIN sections s ON s.id=u.section_id
     JOIN classes c ON c.section_id=u.section_id
     WHERE c.teacher_id=$1 AND u.role='student' ORDER BY s.name, u.roll_no`, [req.user.id]);
  res.json(rows);
}));

router.get('/subjects', authorize(ANY), wrap(async (_req, res) => {
  res.json((await query('SELECT id, name, code FROM subjects ORDER BY id')).rows);
}));

router.get('/announcements', authorize(ANY), wrap(async (_req, res) => {
  const { rows } = await query('SELECT id, title, text, created_at FROM announcements ORDER BY created_at DESC LIMIT 30');
  res.json(rows.map((a) => ({ id: a.id, title: a.title, text: a.text, ago: ago(a.created_at) })));
}));

module.exports = router;
