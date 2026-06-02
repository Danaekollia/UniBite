const express = require('express');
const bcrypt = require('bcrypt');
const pool = require('../config/db');
const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Συμπλήρωσε όλα τα πεδία' });
  }
  const allowedRoles = ['cook', 'consumer'];
  const userRole = allowedRoles.includes(role) ? role : 'consumer';
  try {
    const hash = await bcrypt.hash(password, 10);
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash, role, credits) VALUES (?, ?, ?, ?, 5)',
      [username, email, hash, userRole]
    );
    const user = { id: result.insertId, username, email, role: userRole, credits: 5 };
    req.session.user = user;
    res.status(201).json({ user });
  } catch (err) {
    console.error('[REGISTER ERROR]', err.message, err.code);
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Το username ή email χρησιμοποιείται ήδη' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Συμπλήρωσε email και κωδικό' });
  }
  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Λάθος email ή κωδικός' });
    }
    const dbUser = rows[0];
    const match = await bcrypt.compare(password, dbUser.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Λάθος email ή κωδικός' });
    }
    const user = { id: dbUser.id, username: dbUser.username, email: dbUser.email, role: dbUser.role, credits: dbUser.credits };
    req.session.user = user;
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Αποσυνδέθηκες' }));
});

module.exports = router;
