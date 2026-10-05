'use strict';
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { signToken } = require('../middleware/auth');
const { HttpError, bad, wrap } = require('../utils/helpers');

/* Simple in-memory brute-force guard: 10 failed attempts per IP per 15 min */
const attempts = new Map();

router.post('/login', wrap(async (req, res) => {
  const ip = req.ip || 'unknown', body = req.body || {};
  const a = attempts.get(ip) || { n: 0, t: Date.now() };
  if (Date.now() - a.t > 15 * 60e3) { a.n = 0; a.t = Date.now(); }
  if (a.n >= 10) throw new HttpError(429, 'Too many attempts. Please wait a few minutes and try again.');

  const id = String(body.identifier || '').trim(), pw = String(body.password || '');
  if (!id || !pw) throw bad('Enter your email or roll number and password.');

  const { rows } = await query(
    `SELECT u.*, s.name AS section FROM users u LEFT JOIN sections s ON s.id=u.section_id
     WHERE lower(u.email)=lower($1) OR u.roll_no=$1`, [id]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(pw, u.password_hash))) {
    a.n++; attempts.set(ip, a);
    throw new HttpError(401, 'Incorrect email/roll number or password.');
  }
  attempts.delete(ip);

  const user = { id: u.id, name: u.name, role: u.role };
  if (u.role === 'student') { user.rollNo = u.roll_no; user.className = u.section; }
  res.json({ token: signToken({ uid: u.id }), user });
}));

module.exports = router;
