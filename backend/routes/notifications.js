const express = require('express');
const pool = require('../config/db');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

// Helper — called from other routes
async function notify(userId, message) {
  await pool.execute(
    'INSERT INTO notifications (user_id, message) VALUES (?, ?)',
    [userId, message]
  );
}

// GET /api/notifications  – unread for current user
router.get('/', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, message, created_at FROM notifications WHERE user_id = ? AND is_read = 0 ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// POST /api/notifications/read-all  – mark all as read
router.post('/read-all', requireLogin, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.session.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

module.exports = { router, notify };
