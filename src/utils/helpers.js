'use strict';
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (m) => new HttpError(400, m);

const iso = (d) => d.toISOString().slice(0, 10);
const pct = (p, n) => (n ? Math.round((100 * p) / n) : 0);

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const niceDate = (s) => { const [y, m, d] = s.split('-'); return `${+d} ${MON[m - 1]} ${y}`; };

function ago(ts) {
  const t = ts instanceof Date ? ts.getTime() : +ts;
  const m = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (m < 60) return `${m} minute${m > 1 ? 's' : ''} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? 's' : ''} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d > 1 ? 's' : ''} ago`;
}

function validDate(d) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '') || iso(new Date(d)) !== d) throw bad('Enter a valid date (YYYY-MM-DD).');
  if (new Date(d) > new Date(Date.now() + 86400e3)) throw bad('You cannot mark attendance for a future date.');
  return d;
}

/* Lets async route handlers throw; Express forwards the error to errorHandler */
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { HttpError, bad, iso, pct, niceDate, ago, validDate, wrap };
