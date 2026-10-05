'use strict';
/* npm run db:init   -> create tables (+ demo data if DB is empty)
   npm run db:reset  -> DROP everything and recreate (DESTROYS DATA) */
const { init, pool } = require('../src/db/init');
const reset = process.argv.includes('--reset');
init({ reset }).then(() => console.log(reset ? 'Database reset and initialised.' : 'Database initialised.'))
  .catch((e) => { console.error('db init failed:', e.message); process.exitCode = 1; })
  .finally(() => pool.end());
