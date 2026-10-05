'use strict';
/* Run: npm test
   Uses TEST_DATABASE_URL (falls back to DATABASE_URL). It RESETS that database - never point it at real data. */
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgres://attendly:attendly@localhost:5432/attendly_test';
process.env.JWT_SECRET = 'test-secret'; process.env.SEED_DEMO = 'true';
const assert = require('node:assert/strict');
const app = require('../src/app');
const { init, pool } = require('../src/db/init');

let base;
const call = async (m, p, body, tok) => {
  const r = await fetch(base + p, { method: m, headers: { 'Content-Type': 'application/json', ...(tok ? { Authorization: 'Bearer ' + tok } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { s: r.status, j: await r.json().catch(() => null) };
};
(async () => {
  await init({ reset: true, seed: true });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  base = 'http://localhost:' + server.address().port;
  let n = 0; const ok = (name) => console.log('  ok', ++n, name);

  assert.equal((await call('GET', '/api/health')).j.db, 'up'); ok('health + database up');
  assert.equal((await call('POST', '/api/auth/login', { identifier: 'prof@college.edu', password: 'wrong' })).s, 401); ok('wrong password rejected');
  assert.equal((await call('POST', '/api/auth/login', {})).s, 400); ok('empty login rejected');
  const T = (await call('POST', '/api/auth/login', { identifier: 'PROF@college.edu', password: 'teacher123' })).j; assert.equal(T.user.role, 'teacher'); ok('teacher login (email case-insensitive)');
  const S = (await call('POST', '/api/auth/login', { identifier: '220101', password: 'student123' })).j; assert.equal(S.user.className, 'CSE-3A'); assert.equal(S.user.rollNo, '220101'); ok('student login by roll no');
  assert.equal((await call('GET', '/api/classes')).s, 401); ok('no token blocked');
  assert.equal((await call('GET', '/api/classes', null, 'garbage.token.here')).s, 401); ok('bad token blocked');
  assert.equal((await call('GET', '/api/teacher/dashboard', null, S.token)).s, 403); ok('student blocked from teacher API');
  assert.equal((await call('GET', '/api/student/overview', null, T.token)).s, 403); ok('teacher blocked from student API');

  const d = (await call('GET', '/api/teacher/dashboard?range=this', null, T.token)).j;
  assert.equal(d.stats.classes, 4); assert.equal(d.stats.students, 8); assert.equal(d.stats.pending, 2);
  assert.equal(d.week.length, 6); assert.equal(d.activity.length, 3); assert.ok(d.stats.avg > 50 && d.stats.avg <= 100);
  assert.match(d.activity[0].time, /ago$/); ok('dashboard shape + stats');
  assert.equal((await call('GET', '/api/teacher/dashboard?range=last', null, T.token)).j.week.length, 6); ok('dashboard last week');

  const cls = (await call('GET', '/api/classes', null, T.token)).j; assert.equal(cls.length, 4); assert.equal(cls[0].count, 8);
  assert.deepEqual(Object.keys(cls[0]).sort(), ['count', 'id', 'name', 'subject', 'time']); ok('classes list');
  const date = new Date().toISOString().slice(0, 10), id = cls[3].id;
  let rows = (await call('GET', `/api/classes/${id}/attendance?date=${date}`, null, T.token)).j; assert.equal(rows.length, 8); assert.equal(rows[0].status, 'P'); ok('class attendance list (default present)');
  const recs = rows.map((r, i) => ({ studentId: r.studentId, status: i < 3 ? 'A' : 'P' }));
  assert.equal((await call('POST', `/api/classes/${id}/attendance`, { date, records: recs }, T.token)).s, 200);
  rows = (await call('GET', `/api/classes/${id}/attendance?date=${date}`, null, T.token)).j; assert.equal(rows.filter((r) => r.status === 'A').length, 3); ok('save + reload attendance');
  const flip = recs.map((r) => ({ ...r, status: 'P' }));
  await call('POST', `/api/classes/${id}/attendance`, { date, records: flip }, T.token);
  rows = (await call('GET', `/api/classes/${id}/attendance?date=${date}`, null, T.token)).j; assert.equal(rows.filter((r) => r.status === 'A').length, 0); ok('re-save updates (upsert)');
  await call('POST', `/api/classes/${id}/attendance`, { date, records: recs }, T.token);
  assert.equal((await call('POST', `/api/classes/${id}/attendance`, { date, records: [{ studentId: 9999, status: 'P' }] }, T.token)).s, 400); ok('foreign student rejected');
  assert.equal((await call('POST', `/api/classes/${id}/attendance`, { date, records: [{ studentId: rows[0].studentId, status: 'X' }] }, T.token)).s, 400); ok('bad status rejected');
  assert.equal((await call('POST', `/api/classes/${id}/attendance`, { date: '2999-01-01', records: recs }, T.token)).s, 400); ok('future date rejected');
  assert.equal((await call('GET', `/api/classes/9999/attendance?date=${date}`, null, T.token)).s, 404); ok('unknown class 404');
  assert.equal((await call('GET', '/api/teacher/dashboard', null, T.token)).j.stats.pending, 1); ok('pending count drops after saving');

  const rep = (await call('GET', '/api/reports?class=CSE-3A&subject=&days=30', null, T.token)).j; assert.equal(rep.count, 8); assert.ok(rep.rows[0].total > 0); assert.ok('avg' in rep && 'low' in rep); ok('report');
  const rep2 = (await call('GET', '/api/reports?class=CSE-3A&subject=Data%20Structures&days=7', null, T.token)).j; assert.equal(rep2.count, 8); ok('report with subject filter');

  const o = (await call('GET', '/api/student/overview', null, S.token)).j;
  assert.equal(o.subjects.length, 4); assert.ok(o.history.length > 0 && o.timetable.length === 5 && o.total === o.attended + o.missed);
  assert.match(o.history[0].date, /^\d{1,2} [A-Z][a-z]{2} \d{4}$/); ok('student overview');
  assert.equal((await call('GET', '/api/students', null, T.token)).j.length, 8); ok('students list');
  assert.equal((await call('GET', '/api/subjects', null, S.token)).j.length, 4); assert.ok((await call('GET', '/api/announcements', null, S.token)).j[0].ago); ok('subjects + announcements');

  const html = await fetch(base + '/'); assert.equal(html.status, 200); assert.match(await html.text(), /Attendly/); ok('frontend served');
  assert.equal((await fetch(base + '/js/app.js')).status, 200); ok('static js served');
  assert.equal((await fetch(base + '/..%2fserver.js')).status, 404); assert.equal((await fetch(base + '/js/../../server.js')).status, 404); ok('path traversal blocked');
  assert.equal((await call('GET', '/api/nope')).s, 404); ok('unknown api route 404 json');
  const bj = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' }); assert.equal(bj.status, 400); ok('invalid JSON -> 400');

  console.log('\nAll ' + n + ' checks passed.');
  server.close(); await pool.end(); process.exit(0);
})().catch((e) => { console.error('FAILED:', e.stack || e.message); process.exit(1); });
