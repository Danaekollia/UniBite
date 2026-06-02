require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 }
}));

// Serve uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve frontend
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Routes
const { router: listingsRouter } = require('./routes/listings');
const { router: notificationsRouter, notify } = require('./routes/notifications');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', listingsRouter);
app.use('/api/requests', require('./routes/requests'));
app.use('/api/ratings', require('./routes/ratings'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/notifications', notificationsRouter);

// DB connection test
app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 AS ok');
    res.json({ connected: true, result: rows[0] });
  } catch (err) {
    res.json({ connected: false, error: err.message, code: err.code });
  }
});

// Current user info
const pool = require('./config/db');
app.get('/api/users/me', async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: 'Μη συνδεδεμένος' });
  try {
    const [rows] = await pool.execute(
      'SELECT id, username, email, role, credits FROM users WHERE id = ?',
      [req.session.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Δεν βρέθηκε' });
    req.session.user = { ...req.session.user, credits: rows[0].credits };
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// Fallback: serve index.html for any unmatched route (Express 5 wildcard syntax)
app.get('/*path', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Background job: αφαίρεση 1 πόντου αν δεν αξιολογήσει εντός 48h από picked_up
async function checkUnratedPickups() {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.consumer_id FROM requests r
       LEFT JOIN ratings rt ON rt.request_id = r.id
       WHERE r.status = 'picked_up'
         AND r.picked_up_at IS NOT NULL
         AND r.picked_up_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)
         AND rt.id IS NULL`
    );
    for (const row of rows) {
      await pool.execute('UPDATE users SET credits = GREATEST(0, credits - 1) WHERE id = ?', [row.consumer_id]);
      await pool.execute("UPDATE requests SET status = 'rating_expired' WHERE id = ?", [row.id]);
      await notify(row.consumer_id, '⏰ Δεν αξιολόγησες γεύμα εντός 48 ωρών από την παραλαβή. Αφαιρέθηκε 1 πόντος.');
      console.log(`[48h check] Αφαιρέθηκε 1 πόντος από consumer id=${row.consumer_id}`);
    }
  } catch (err) {
    console.error('[48h check] Σφάλμα:', err.message);
  }
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`UniBite server running on http://localhost:${PORT}`);
  // Τρέχει κάθε ώρα
  setInterval(checkUnratedPickups, 60 * 60 * 1000);
  checkUnratedPickups();
});
