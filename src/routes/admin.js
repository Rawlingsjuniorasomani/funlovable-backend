const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const AdminController = require('../controllers/AdminController');
const pool = require('../db/pool');

const router = express.Router();

// Get Dashboard Stats (students, teachers, revenue, etc.)
router.get('/stats', authMiddleware, requireRole('admin'), AdminController.getStats);

// Get all payments with subscription details (admin only)
router.get('/payments', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { status, userId, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        p.id as payment_id,
        p.user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        p.amount,
        p.currency,
        p.status as payment_status,
        p.reference,
        p.paystack_reference,
        p.created_at as payment_date,
        s.id as subscription_id,
        s.plan as plan_id,
        pl.plan_name as plan,
        s.status as subscription_status,
        s.amount as subscription_amount,
        s.starts_at,
        s.expires_at,
        s.created_at as subscription_created_at
      FROM payments p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN subscriptions s ON p.user_id = s.user_id
      LEFT JOIN plans pl ON s.plan = pl.id
      WHERE 1=1
    `;


    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND p.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (userId) {
      query += ` AND p.user_id::text = $${paramCount}`;
      params.push(userId);
      paramCount++;
    }

    query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM payments p WHERE 1=1`;
    const countParams = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND p.status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (userId) {
      countQuery += ` AND p.user_id::text = $${countParamCount}`;
      countParams.push(userId);
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      payments: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });
  } catch (error) {
    console.error('Get admin payments error:', error);
    res.status(500).json({ error: 'Failed to fetch payments', details: error.message });
  }
});

// Get all subscriptions (admin only)
router.get('/subscriptions', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { status, plan, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT 
        s.id,
        s.user_id,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        s.plan,
        s.status,
        s.amount,
        s.starts_at,
        s.expires_at,
        s.created_at,
        s.updated_at
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (status) {
      query += ` AND s.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    if (plan) {
      query += ` AND s.plan = $${paramCount}`;
      params.push(plan);
      paramCount++;
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM subscriptions s WHERE 1=1`;
    const countParams = [];
    let countParamCount = 1;

    if (status) {
      countQuery += ` AND s.status = $${countParamCount}`;
      countParams.push(status);
      countParamCount++;
    }

    if (plan) {
      countQuery += ` AND s.plan = $${countParamCount}`;
      countParams.push(plan);
      countParamCount++;
    }

    const countResult = await pool.query(countQuery, countParams);

    res.json({
      subscriptions: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    });
  } catch (error) {
    console.error('Get admin subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions', details: error.message });
  }
});

// Update subscription (admin only)
router.put('/subscriptions/:id', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { plan, status, expiresAt } = req.body;

    const result = await pool.query(`
      UPDATE subscriptions 
      SET plan = COALESCE($1, plan),
          status = COALESCE($2, status),
          expires_at = COALESCE($3, expires_at),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
    `, [plan, status, expiresAt, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

module.exports = router;
