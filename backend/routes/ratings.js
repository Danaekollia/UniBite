const express = require('express');
const pool = require('../config/db');
const { requireRole } = require('../middleware/auth');
const { notify } = require('./notifications');
const router = express.Router();

// POST /api/ratings
router.post('/', requireRole('consumer'), async (req, res) => {
  const { request_id, score } = req.body;
  const consumerId = req.session.user.id;
  if (!score || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Βαθμολογία 1-5' });
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [reqRows] = await conn.execute(
      `SELECT r.*, l.cook_id FROM requests r JOIN listings l ON r.listing_id = l.id
       WHERE r.id = ? AND r.consumer_id = ? AND r.status = 'picked_up'`,
      [request_id, consumerId]
    );
    if (reqRows.length === 0) {
      await conn.rollback();
      return res.status(400).json({ error: 'Δεν μπορείς να αξιολογήσεις' });
    }
    const request = reqRows[0];
    const [existing] = await conn.execute('SELECT id FROM ratings WHERE request_id = ?', [request_id]);
    if (existing.length > 0) {
      await conn.rollback();
      return res.status(409).json({ error: 'Έχεις ήδη αξιολογήσει' });
    }
    await conn.execute(
      'INSERT INTO ratings (request_id, consumer_id, listing_id, score) VALUES (?, ?, ?, ?)',
      [request_id, consumerId, request.listing_id, score]
    );
    // Cook earns credits: >3 → +2, ≤3 → +1
    const creditBonus = score > 3 ? 2 : 1;
    await conn.execute('UPDATE users SET credits = credits + ? WHERE id = ?', [creditBonus, request.cook_id]);
    await conn.commit();
    const stars = '★'.repeat(score) + '☆'.repeat(5 - score);
    await notify(request.cook_id, `⭐ Έλαβες ${creditBonus} πόντο${creditBonus > 1 ? 'υς' : ''} από αξιολόγηση γεύματος με ${stars} (${score}/5).`);
    res.status(201).json({ message: 'Αξιολόγηση καταχωρήθηκε', credit_bonus: creditBonus });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: 'Σφάλμα server' });
  } finally {
    conn.release();
  }
});

// GET /api/ratings/listing/:id  – average rating for a listing
router.get('/listing/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT AVG(score) AS avg_score, COUNT(*) AS total FROM ratings WHERE listing_id = ?',
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/ratings/cook-history  – all ratings received by the logged-in cook
router.get('/cook-history', requireRole('cook'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT rt.id, rt.score, rt.created_at,
              l.title AS listing_title,
              u.username AS consumer_name,
              CASE WHEN rt.score > 3 THEN 2 ELSE 1 END AS credits_earned
       FROM ratings rt
       JOIN listings l ON rt.listing_id = l.id
       JOIN users u ON rt.consumer_id = u.id
       WHERE l.cook_id = ?
       ORDER BY rt.created_at DESC`,
      [req.session.user.id]
    );
    const total_credits = rows.reduce((sum, r) => sum + r.credits_earned, 0);
    const avg_score = rows.length
      ? (rows.reduce((s, r) => s + r.score, 0) / rows.length).toFixed(1)
      : null;
    res.json({ ratings: rows, total_credits_from_meals: total_credits, avg_score, total_ratings: rows.length });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

module.exports = router;
