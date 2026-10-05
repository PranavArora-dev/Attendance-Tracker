'use strict';
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { query } = require('../db/pool');
const { HttpError, wrap } = require('../utils/helpers');

const signToken = (payload, expiresIn = '7d') => jwt.sign(payload, env.JWT_SECRET, { expiresIn });

/* authorize(['teacher']) -> checks Bearer token, loads user into req.user, enforces role */
const authorize = (roles) => wrap(async (req, _res, next) => {
  let uid;
  try { uid = jwt.verify((req.headers.authorization || '').replace(/^Bearer\s+/i, ''), env.JWT_SECRET).uid; }
  catch { throw new HttpError(401, 'Please sign in again.'); }
  const { rows } = await query('SELECT * FROM users WHERE id=$1', [uid]);
  if (!rows[0]) throw new HttpError(401, 'Please sign in again.');
  if (roles && !roles.includes(rows[0].role)) throw new HttpError(403, 'You do not have access to this.');
  req.user = rows[0];
  next();
});

module.exports = { signToken, authorize };
