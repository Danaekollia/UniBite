const express = require('express');
const pool = require('../config/db');
const { requireRole } = require('../middleware/auth');
const router = express.Router();

// GET /api/admin/stats
router.get('/stats', requireRole('admin'), async (req, res) => {
  try {
    const [portionsRow] = await pool.execute(
      `SELECT COUNT(*) AS total_shared
       FROM requests
       WHERE status = 'picked_up'
         AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)`
    );
    const [totalUsers] = await pool.execute("SELECT COUNT(*) AS total FROM users WHERE role != 'admin'");
    const [totalListings] = await pool.execute("SELECT COUNT(*) AS total FROM listings");
    res.json({
      portions_shared_last_month: portionsRow[0].total_shared,
      total_users: totalUsers[0].total,
      total_listings: totalListings[0].total
    });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/admin/leaderboard
router.get('/leaderboard', requireRole('admin'), async (req, res) => {
  try {
    const [topDonors] = await pool.execute(
      `SELECT u.id, u.username, COUNT(r.id) AS portions_given
       FROM users u
       JOIN listings l ON l.cook_id = u.id
       JOIN requests r ON r.listing_id = l.id AND r.status = 'picked_up'
       GROUP BY u.id
       ORDER BY portions_given DESC
       LIMIT 5`
    );
    const [topRated] = await pool.execute(
      `SELECT l.id, l.title, u.username AS cook_name,
              AVG(rt.score) AS avg_score, COUNT(rt.id) AS rating_count
       FROM listings l
       JOIN users u ON l.cook_id = u.id
       JOIN ratings rt ON rt.listing_id = l.id
       GROUP BY l.id
       HAVING rating_count >= 1
       ORDER BY avg_score DESC, rating_count DESC
       LIMIT 5`
    );
    res.json({ top_donors: topDonors, top_rated: topRated });
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/admin/portions-detail  – picked-up requests last month
router.get('/portions-detail', requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT r.id, r.created_at,
              uc.username AS consumer_name,
              l.title     AS listing_title,
              uk.username AS cook_name
       FROM requests r
       JOIN users    uc ON r.consumer_id = uc.id
       JOIN listings l  ON r.listing_id  = l.id
       JOIN users    uk ON l.cook_id     = uk.id
       WHERE r.status = 'picked_up'
         AND r.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
       ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/admin/users-detail  – all non-admin users
router.get('/users-detail', requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, username, email, role, credits, created_at
       FROM users
       WHERE role != 'admin'
       ORDER BY created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

// GET /api/admin/listings-detail  – all listings
router.get('/listings-detail', requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT l.id, l.title, u.username AS cook_name,
              l.status, l.total_portions, l.available_portions, l.created_at
       FROM listings l
       JOIN users u ON l.cook_id = u.id
       ORDER BY l.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Σφάλμα server' });
  }
});

module.exports = router;
