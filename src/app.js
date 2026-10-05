'use strict';
const path = require('node:path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const env = require('./config/env');
const { query } = require('./db/pool');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();
app.set('trust proxy', 1);          // correct client IP behind Render / proxies
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
if (env.CORS_ORIGIN) app.use(cors({ origin: env.CORS_ORIGIN, allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '200kb' }));

/* ---------- API ---------- */
app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.get('/api/health', async (_req, res) => {
  try { await query('SELECT 1'); res.json({ ok: true, db: 'up' }); }
  catch { res.status(503).json({ ok: false, db: 'down' }); }
});
app.use('/api/auth', require('./routes/auth'));
app.use('/api/teacher', require('./routes/teacher'));
app.use('/api/classes', require('./routes/attendance'));   // /:id/attendance
app.use('/api/reports', require('./routes/reports'));
app.use('/api/student', require('./routes/student'));
app.use('/api', require('./routes/lookup'));               // classes, students, subjects, announcements

/* ---------- Frontend (unchanged static files) ---------- */
app.use(express.static(path.join(__dirname, '..', 'public'), { setHeaders: (res) => res.set('Cache-Control', 'no-cache') }));

app.use(notFound);
app.use(errorHandler);
module.exports = app;
