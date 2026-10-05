'use strict';
const notFound = (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not found.' });
  res.status(404).type('text').send('Page not found.');
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.status ? err.message : 'Something went wrong. Please try again.';
  if (err.type === 'entity.too.large') { status = 413; message = 'Request is too large.'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Invalid JSON body.'; }
  else if (status >= 500) console.error(err);
  if (res.headersSent) return;
  if (req.path.startsWith('/api/')) return res.status(status).json({ message });
  res.status(status).type('text').send(message);
};
module.exports = { notFound, errorHandler };
