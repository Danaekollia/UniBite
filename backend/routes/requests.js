const express = require('express');
const pool = require('../config/db');
const { requireLogin, requireRole } = require('../middleware/auth');
const { syncStatus } = require('./listings');
const { notify } = require('./notifications');
const router = express.Router();

// POST /api/requests  – consumer reserves a portion
router.post('/', requireRole('consumer'), async (req, res) => {
  const { listing_id } = req.body;
  const consumerId = req.session.user.id;
  try {
    const [userRows] = await pool.execute('SELECT credits FROM users WHERE id = ?', [consumerId]);
    if (userRows[0].credits < 1) {
      return res.status(400).json({ error: 'Δεν έχεις αρκετούς πόντους (απαιτείται τουλάχιστον 1)' });
    }
    const [listingRows] = await pool.execute(
      "SELECT * FROM listings WHERE id = ? AND status = 'active'",
      [listing_id]
    );
    if (listingRows.length === 0) {
      return res.status(400).json({ error: 'Η αγγελία δεν είναι διαθέσιμη' });
    }
    const [existing] = await pool.execute(
      "SELECT id FROM requests WHERE listing_id = ? AND consumer_id = ? AND status IN ('pending','approved')",
      [listing_id, consumerId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Έχεις ήδη αίτημα για αυτή την αγγελία' });
    }
    const [result] = await pool.execute(
      'INSERT INTO requests (listing_id, consumer_id, status) VALUES (?, ?, ?)',
      [listing_id, consumerId, 'pending']
    );
    res.status(201).json({ id: result.insertId, listing_id, consumer_id: consumerId, status: 'pending' });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/requests/incoming  – cook sees requests for their listings
router.get('/incoming', requireRole('cook'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, u.username AS consumer_name, l.title AS listing_title, l.available_portions
       FROM requests r
       JOIN users u ON r.consumer_id = u.id
       JOIN listings l ON r.listing_id = l.id
       WHERE l.cook_id = ?
       ORDER BY r.created_at DESC`,
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/requests/mine  – consumer sees own requests (with rating info)
router.get('/mine', requireRole('consumer'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, l.title AS listing_title, l.id AS listing_id,
              u.username AS cook_name,
              rt.score AS rating_score, rt.id AS rating_id
       FROM requests r
       JOIN listings l ON r.listing_id = l.id
       JOIN users u ON l.cook_id = u.id
       LEFT JOIN ratings rt ON rt.request_id = r.id
       WHERE r.consumer_id = ?
       ORDER BY r.created_at DESC`,
      [req.session.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// PUT /api/requests/:id/approve
router.put('/:id/approve', requireRole('cook'), async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute(
      `SELECT r.*, l.available_portions, l.id AS lid, l.cook_id
       FROM requests r JOIN listings l ON r.listing_id = l.id
       WHERE r.id = ? AND r.status = 'pending'`,
      [req.params.id]
    );
    if (rows.length === 0 || rows[0].cook_id !== req.session.user.id) {
      await conn.rollback();
      return res.status(404).json({ error: 'Δεν βρέθηκε' });
    }
    const req_data = rows[0];
    if (req_data.available_portions < 1) {
      await conn.rollback();
      return res.status(400).json({ error: 'Δεν υπάρχουν διαθέσιμες μερίδες' });
    }
    await conn.execute("UPDATE requests SET status = 'approved' WHERE id = ?", [req.params.id]);
    await conn.execute('UPDATE listings SET available_portions = available_portions - 1 WHERE id = ?', [req_data.lid]);
    await conn.execute('UPDATE users SET credits = credits - 1 WHERE id = ?', [req_data.consumer_id]);
    await conn.commit();
    await syncStatus(pool, req_data.lid);
    await notify(req_data.consumer_id, '🍽️ Το αίτημά σου εγκρίθηκε! Αφαιρέθηκε 1 πόντος για την κράτηση.');
    res.json({ message: 'Εγκρίθηκε' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Σφάλμα server' });
  } finally {
    conn.release();
  }
});

// PUT /api/requests/:id/reject
router.put('/:id/reject', requireRole('cook'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, l.cook_id FROM requests r JOIN listings l ON r.listing_id = l.id
       WHERE r.id = ? AND r.status = 'pending'`,
      [req.params.id]
    );
    if (rows.length === 0 || rows[0].cook_id !== req.session.user.id) {
      return res.status(404).json({ error: 'Δεν βρέθηκε' });
    }
    await pool.execute("UPDATE requests SET status = 'rejected' WHERE id = ?", [req.params.id]);
    res.json({ message: 'Απορρίφθηκε' });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// PUT /api/requests/:id/picked-up
router.put('/:id/picked-up', requireRole('cook'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, l.cook_id FROM requests r JOIN listings l ON r.listing_id = l.id
       WHERE r.id = ? AND r.status = 'approved'`,
      [req.params.id]
    );
    if (rows.length === 0 || rows[0].cook_id !== req.session.user.id) {
      return res.status(404).json({ error: 'Δεν βρέθηκε' });
    }
    await pool.execute(
      "UPDATE requests SET status = 'picked_up', picked_up_at = NOW() WHERE id = ?",
      [req.params.id]
    );
    res.json({ message: 'Σημειώθηκε ως παραληφθέν' });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// PUT /api/requests/:id/no-show
router.put('/:id/no-show', requireRole('cook'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.*, l.cook_id FROM requests r JOIN listings l ON r.listing_id = l.id
       WHERE r.id = ? AND r.status = 'approved'`,
      [req.params.id]
    );
    if (rows.length === 0 || rows[0].cook_id !== req.session.user.id) {
      return res.status(404).json({ error: 'Δεν βρέθηκε' });
    }
    await pool.execute("UPDATE requests SET status = 'no_show' WHERE id = ?", [req.params.id]);
    await pool.execute('UPDATE users SET credits = GREATEST(0, credits - 1) WHERE id = ?', [rows[0].consumer_id]);
    await notify(rows[0].consumer_id, '⚠️ Δεν παρέλαβες μερίδα που είχες κρατήσει. Αφαιρέθηκε 1 πόντος.');
    res.json({ message: 'Σημειώθηκε ως no-show, αφαιρέθηκε 1 πόντος' });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

module.exports = router;
