'use strict';
const { Pool, types } = require('pg');
const env = require('../config/env');

/* Return DATE columns as plain 'YYYY-MM-DD' strings (not JS Date objects) */
types.setTypeParser(1082, (v) => v);

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
  max: 10,
});
pool.on('error', (e) => console.error('[pg] idle client error:', e.message));

const query = (text, params) => pool.query(text, params);

/* Run fn(client) inside a transaction */
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await fn(client);
    await client.query('COMMIT');
    return r;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
module.exports = { pool, query, tx };
