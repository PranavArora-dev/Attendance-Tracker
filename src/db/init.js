'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { pool, query } = require('./pool');
const env = require('../config/env');
const { seedDemo } = require('./seed');

async function initSchema() {
  await query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
}
async function dropAll() {
  await query('DROP TABLE IF EXISTS activity, announcements, attendance, classes, users, subjects, sections CASCADE');
}
/* Create tables (idempotent) and, if enabled, demo data when the DB is empty */
async function init({ reset = false, seed = env.SEED_DEMO } = {}) {
  if (reset) await dropAll();
  await initSchema();
  if (seed) await seedDemo();
}
module.exports = { init, initSchema, dropAll, pool };
