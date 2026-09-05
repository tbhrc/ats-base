// Every write must be attributable and auditable (tbhrc/recruitment#16
// Section 11). The adapter is a service-to-service surface (agents, not
// human browser sessions), so it authenticates with a single bearer token
// rather than OpenCATS's own cookie-session auth -- but every request must
// also name an actor, which is logged with every write.

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || token !== process.env.ADAPTER_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const actor = req.get('x-actor');
  if (!actor) {
    return res.status(400).json({ error: 'X-Actor header is required on every request for audit attribution' });
  }
  req.actor = actor;
  next();
}

module.exports = { requireAuth };
