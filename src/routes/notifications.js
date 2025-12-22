const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const NotificationModel = require('../models/NotificationModel');
const { authMiddleware, requireRole } = require('../middleware/auth');


router.get('/my', authMiddleware, async (req, res) => {
  try {
    const notifications = await NotificationModel.getByUser(req.user.id);
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});


router.get('/', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const notifications = await NotificationModel.getAll();
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});


router.put('/:id/read', authMiddleware, async (req, res) => {
  try {
    
    const notif = await pool.query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [req.params.id]
    );

    if (notif.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (String(notif.rows[0].user_id) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const notification = await NotificationModel.markAsRead(req.params.id);
    res.json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});


router.put('/read-all', authMiddleware, async (req, res) => {
  try {
    
    await NotificationModel.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});


router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const notif = await pool.query(
      'SELECT user_id FROM notifications WHERE id = $1',
      [req.params.id]
    );

    if (notif.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (String(notif.rows[0].user_id) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await NotificationModel.delete(req.params.id);
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

module.exports = router;
