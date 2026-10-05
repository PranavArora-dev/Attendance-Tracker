'use strict';
const { query } = require('../db/pool');
const { HttpError } = require('./helpers');

const CLASS_SQL = `SELECT c.id, s.name AS name, sub.name AS subject, c.time_label AS time, c.section_id, c.days,
  (SELECT COUNT(*)::int FROM users u WHERE u.section_id=c.section_id AND u.role='student') AS count
  FROM classes c JOIN sections s ON s.id=c.section_id JOIN subjects sub ON sub.id=c.subject_id`;

const classesFor = async (u) => (u.role === 'teacher'
  ? await query(CLASS_SQL + ' WHERE c.teacher_id=$1 ORDER BY c.id', [u.id])
  : await query(CLASS_SQL + ' WHERE c.section_id=$1 ORDER BY c.id', [u.section_id ?? -1])).rows;

const publicClass = ({ id, name, subject, time, count }) => ({ id, name, subject, time, count });

async function ownClass(u, id) {
  const { rows } = await query(CLASS_SQL + ' WHERE c.id=$1 AND c.teacher_id=$2', [Number.isInteger(+id) ? +id : -1, u.id]);
  if (!rows[0]) throw new HttpError(404, 'Class not found.');
  return rows[0];
}
module.exports = { classesFor, publicClass, ownClass };
