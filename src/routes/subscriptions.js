const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');
const PaymentService = require('../services/PaymentService');

const router = express.Router();

router.get('/me', authMiddleware, requireRole(['parent', 'student']), async (req, res) => {
  try {
    const subRes = await pool.query(
      `SELECT s.*, p.plan_name, p.price, p.duration_days, p.features
       FROM subscriptions s
       LEFT JOIN plans p ON s.plan = p.id
       WHERE s.user_id = $1
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [req.user.id]
    );

    const subscription = subRes.rows[0] || null;

    let childrenCount = 0;
    if (req.user.role === 'parent') {
      const countRes = await pool.query(
        'SELECT COUNT(*)::int as count FROM parent_children WHERE parent_id = $1',
        [req.user.id]
      );
      childrenCount = Number(countRes.rows[0]?.count || 0);
    }

    let maxChildren = 1;
    if (subscription) {
      const features = subscription.features;
      const planName = (subscription.plan_name || '').toLowerCase();
      const price = subscription.price != null ? Number(subscription.price) : null;

      if (
        features &&
        typeof features === 'object' &&
        !Array.isArray(features) &&
        typeof features.maxChildren === 'number'
      ) {
        maxChildren = Number(features.maxChildren);
      } else if (planName.includes('family')) {
        maxChildren = 4;
      } else if (price != null) {
        maxChildren = price >= 1300 ? 4 : 1;
      }
    }

    res.json({
      subscription: subscription
        ? {
            id: subscription.id,
            planId: subscription.plan,
            planName: subscription.plan_name,
            status: subscription.status,
            amount: subscription.amount,
            startsAt: subscription.starts_at,
            expiresAt: subscription.expires_at
          }
        : null,
      limits: {
        maxChildren
      },
      usage: {
        childrenCount
      }
    });
  } catch (error) {
    console.error('Get my subscription error:', error);
    res.status(500).json({ error: 'Failed to fetch subscription', details: error.message });
  }
});

router.post('/upgrade', authMiddleware, requireRole(['parent', 'student']), async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: 'planId is required' });
    }

    const planRes = await pool.query('SELECT id, price FROM plans WHERE id = $1', [planId]);
    if (planRes.rows.length === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const amount = Number(planRes.rows[0].price);
    const result = await PaymentService.initializePayment(req.user, planId, amount);

    res.json(result);
  } catch (error) {
    console.error('Upgrade subscription error:', error);
    res.status(500).json({ error: 'Failed to initialize upgrade', details: error.message });
  }
});

module.exports = router;
