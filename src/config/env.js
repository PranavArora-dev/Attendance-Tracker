'use strict';
require('dotenv').config();
const crypto = require('node:crypto');

if (!process.env.JWT_SECRET) {
  console.warn('[warn] JWT_SECRET is not set. Using a temporary secret; everyone is signed out on restart.');
}
module.exports = {
  PORT: +process.env.PORT || 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgres://attendly:attendly@localhost:5432/attendly',
  DATABASE_SSL: process.env.DATABASE_SSL === 'true',
  JWT_SECRET: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'),
  SEED_DEMO: process.env.SEED_DEMO !== 'false',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
};
