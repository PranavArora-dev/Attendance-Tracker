'use strict';
const env = require('./src/config/env');
const app = require('./src/app');
const { init, pool } = require('./src/db/init');

(async () => {
  await init();                                   // create tables + demo seed (if empty & SEED_DEMO != false)
  const server = app.listen(env.PORT, () => console.log(`Attendly (PERN backend) running on http://localhost:${env.PORT}`));
  const stop = () => server.close(() => pool.end().then(() => process.exit(0)));
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
})().catch((e) => { console.error('Failed to start:', e.message); process.exit(1); });
