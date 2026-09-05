const express = require('express');
const { requireAuth } = require('./auth');
const routes = require('./routes');

const app = express();
app.use(express.json());

// Unauthenticated health check only -- everything else requires the bearer
// token + X-Actor header (see auth.js).
app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api', requireAuth, routes);

app.use((err, req, res, _next) => {
  console.error(JSON.stringify({ level: 'error', message: err.message }));
  res.status(500).json({ error: 'Internal error' });
});

const port = process.env.PORT || 3012;
app.listen(port, () => console.log(`tb-ats-adapter listening on :${port}`));
