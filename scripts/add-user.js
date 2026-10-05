'use strict';
/* Use: npm run add-user -- teacher "Name" email password
        npm run add-user -- student "Name" rollNo password SECTION
   Section is created automatically (e.g. CSE-3A). */
const bcrypt = require('bcryptjs');
const { query, pool } = require('../src/db/pool');
const { initSchema } = require('../src/db/init');

const [role, name, login, password, section] = process.argv.slice(2);
if (!['teacher', 'student'].includes(role) || !name || !login || !password || (role === 'student' && !section) || password.length < 6) {
  console.log('Usage:\n  npm run add-user -- teacher "Name" email password\n  npm run add-user -- student "Name" rollNo password SECTION\n(password must be at least 6 characters)');
  process.exit(1);
}
(async () => {
  await initSchema();
  let sectionId = null;
  if (role === 'student') {
    await query('INSERT INTO sections(name) VALUES($1) ON CONFLICT (name) DO NOTHING', [section]);
    sectionId = (await query('SELECT id FROM sections WHERE name=$1', [section])).rows[0].id;
  }
  await query(
    `INSERT INTO users(name,email,roll_no,password_hash,role,section_id) VALUES($1,$2,$3,$4,$5,$6)`,
    [name, role === 'teacher' ? login.toLowerCase() : null, role === 'student' ? login : null, bcrypt.hashSync(password, 10), role, sectionId]);
  console.log(`Created ${role}: ${name}`);
})().catch((e) => {
  console.log('Could not create user:', e.code === '23505' ? 'that email or roll number already exists.' : e.message);
  process.exitCode = 1;
}).finally(() => pool.end());
