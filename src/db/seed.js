'use strict';
const bcrypt = require('bcryptjs');
const { query, tx } = require('./pool');

/* Demo data: only when the users table is empty */
async function seedDemo() {
  const { rows: [{ n }] } = await query('SELECT COUNT(*)::int AS n FROM users');
  if (n > 0) return false;

  await tx(async (c) => {
    const now = Date.now(), H = 3600e3;
    const teacherHash = bcrypt.hashSync('teacher123', 10), studentHash = bcrypt.hashSync('student123', 10);

    const sec = (await c.query(`INSERT INTO sections(name) VALUES('CSE-3A') RETURNING id`)).rows[0].id;
    const subs = [['Data Structures', 'CS301'], ['Web Development', 'CS302'], ['Database Management', 'CS303'], ['Operating Systems', 'CS304']];
    const subIds = [];
    for (const s of subs) subIds.push((await c.query('INSERT INTO subjects(name,code) VALUES($1,$2) RETURNING id', s)).rows[0].id);

    const teacher = (await c.query(
      `INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'teacher') RETURNING id`,
      ['Prof. Sharma', 'prof@college.edu', teacherHash])).rows[0].id;

    const pctTargets = [92, 89, 79, 95, 85, 88, 76, 90];
    const names = ['Pranav Arora', 'Riya Sharma', 'Aaditya Singh', 'Neha Gupta', 'Karan Verma', 'Muskan Jain', 'Arpit Soni', 'Tanya Mehta'];
    const stu = [];
    for (let i = 0; i < names.length; i++) {
      const id = (await c.query(
        `INSERT INTO users(name,roll_no,password_hash,role,section_id) VALUES($1,$2,$3,'student',$4) RETURNING id`,
        [names[i], String(220101 + i), studentHash, sec])).rows[0].id;
      stu.push({ id, p: pctTargets[i] });
    }

    const times = ['9:00 AM - 10:00 AM', '11:00 AM - 12:00 PM', '1:00 PM - 2:00 PM', '3:00 PM - 4:00 PM'];
    const cls = [];
    for (let i = 0; i < times.length; i++) {
      cls.push((await c.query(
        'INSERT INTO classes(section_id,subject_id,teacher_id,time_label) VALUES($1,$2,$3,$4) RETURNING id',
        [sec, subIds[i], teacher, times[i]])).rows[0].id);
    }

    /* 35 days of history. Today only the first 2 classes are marked, so 2 show as "pending". */
    const cIds = [], sIds = [], dates = [], stats = [];
    for (let d = 0; d < 35; d++) {
      const dt = new Date(now - d * 86400e3), dow = dt.getUTCDay(), date = dt.toISOString().slice(0, 10);
      cls.forEach((cid, ci) => {
        const weekday = dow >= 1 && dow <= 5;
        if (d === 0 ? ci > 1 : !weekday) return;
        stu.forEach((s) => {
          cIds.push(cid); sIds.push(s.id); dates.push(date);
          stats.push(((s.id * 7919 + cid * 104729 + d * 1299709) % 100) < s.p ? 'P' : 'A');
        });
      });
    }
    await c.query(
      `INSERT INTO attendance(class_id,student_id,date,status)
       SELECT * FROM unnest($1::int[], $2::int[], $3::date[], $4::char[])`,
      [cIds, sIds, dates, stats]);

    await c.query('INSERT INTO announcements(title,text,created_at) VALUES($1,$2,$3),($4,$5,$6)', [
      'Internal Exam Schedule', 'Internal exams will be conducted from 15th Oct onwards.', new Date(now - 48 * H),
      'Library Timings', 'Library stays open until 8 PM during exams.', new Date(now - 120 * H)]);

    await c.query(`INSERT INTO activity(user_id,type,text,created_at) VALUES
      ($1,'check',$2,$3),($1,'plus',$4,$5),($1,'doc',$6,$7)`, [
      teacher,
      'You marked attendance for Data Structures', new Date(now - 2 * H),
      'New student Tanya Mehta added to CSE-3A', new Date(now - 4 * H),
      'Attendance report generated for CSE-3A', new Date(now - 6 * H)]);
  });
  console.log('[seed] Demo data created: prof@college.edu / teacher123, roll 220101 / student123');
  return true;
}
module.exports = { seedDemo };
