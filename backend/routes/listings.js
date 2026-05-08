const express = require('express');
const multer = require('multer');
const path = require('path');
const pool = require('../config/db');
const { requireLogin, requireRole } = require('../middleware/auth');
const router = express.Router();

const storage = multer.diskStorage({
  destination: path.join(__dirname, '..', 'uploads'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

async function expireOldListings(pool) {
  await pool.execute(
    `UPDATE listings SET status = 'expired'
     WHERE status != 'expired' AND created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR)`
  );
}

async function syncStatus(pool, listingId) {
  await pool.execute(
    `UPDATE listings SET status = CASE
       WHEN created_at < DATE_SUB(NOW(), INTERVAL 48 HOUR) THEN 'expired'
       WHEN available_portions = 0 THEN 'inactive'
       ELSE 'active'
     END
     WHERE id = ?`,
    [listingId]
  );
}

// GET /api/listings  – consumer feed (active + inactive, not expired)
router.get('/', requireLogin, async (req, res) => {
  try {
    await expireOldListings(pool);
    const [rows] = await pool.execute(
      `SELECT l.*, u.username AS cook_name
       FROM listings l JOIN users u ON l.cook_id = u.id
       WHERE l.status != 'expired'
       ORDER BY l.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/listings/my  – cook sees own listings
router.get('/my', requireRole('cook'), async (req, res) => {
  try {
    await expireOldListings(pool);
    const [rows] = await pool.execute(
      'SELECT * FROM listings WHERE cook_id = ? ORDER BY created_at DESC',
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/listings/:id
router.get('/:id', requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT l.*, u.username AS cook_name
       FROM listings l JOIN users u ON l.cook_id = u.id
       WHERE l.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Δεν βρέθηκε' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// POST /api/listings  – create
router.post('/', requireRole('cook'), upload.single('photo'), async (req, res) => {
  const { title, description, total_portions, pickup_location, pickup_lat, pickup_lng, pickup_time, allergens } = req.body;
  if (!title || !total_portions || !pickup_location || !pickup_time) {
    return res.status(400).json({ error: 'Συμπλήρωσε τα υποχρεωτικά πεδία' });
  }
  const photo_url = req.file ? '/uploads/' + req.file.filename : null;
  const allergensJson = allergens ? JSON.stringify(typeof allergens === 'string' ? JSON.parse(allergens) : allergens) : '[]';
  try {
    const [result] = await pool.execute(
      `INSERT INTO listings (cook_id, title, description, photo_url, total_portions, available_portions,
        pickup_location, pickup_lat, pickup_lng, pickup_time, allergens, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [req.session.user.id, title, description || null, photo_url,
       total_portions, total_portions, pickup_location,
       pickup_lat || null, pickup_lng || null, pickup_time, allergensJson]
    );
    const [rows] = await pool.execute('SELECT * FROM listings WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// PUT /api/listings/:id  – edit (only owner)
router.put('/:id', requireRole('cook'), upload.single('photo'), async (req, res) => {
  const { title, description, pickup_location, pickup_lat, pickup_lng, pickup_time, allergens } = req.body;
  try {
    const [rows] = await pool.execute('SELECT * FROM listings WHERE id = ? AND cook_id = ?', [req.params.id, req.session.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Δεν βρέθηκε ή δεν έχεις δικαίωμα' });
    const listing = rows[0];
    const photo_url = req.file ? '/uploads/' + req.file.filename : listing.photo_url;
    const allergensJson = allergens ? JSON.stringify(typeof allergens === 'string' ? JSON.parse(allergens) : allergens) : listing.allergens;
    await pool.execute(
      `UPDATE listings SET title=?, description=?, photo_url=?, pickup_location=?,
        pickup_lat=?, pickup_lng=?, pickup_time=?, allergens=?
       WHERE id = ?`,
      [title || listing.title, description ?? listing.description, photo_url,
       pickup_location || listing.pickup_location, pickup_lat ?? listing.pickup_lat,
       pickup_lng ?? listing.pickup_lng, pickup_time || listing.pickup_time,
       allergensJson, req.params.id]
    );
    const [updated] = await pool.execute('SELECT * FROM listings WHERE id = ?', [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// DELETE /api/listings/:id
router.delete('/:id', requireRole('cook'), async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM listings WHERE id = ? AND cook_id = ?', [req.params.id, req.session.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Δεν βρέθηκε ή δεν έχεις δικαίωμα' });
    await pool.execute('DELETE FROM listings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Η αγγελία διαγράφηκε' });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

module.exports = { router, syncStatus };
