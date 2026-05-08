function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'Απαιτείται σύνδεση' });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Δεν έχεις δικαίωμα' });
    }
    next();
  };
}

module.exports = { requireLogin, requireRole };
