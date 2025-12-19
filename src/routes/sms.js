const express = require('express');
const { authMiddleware, requireRole } = require('../middleware/auth');
const SmsService = require('../services/SmsService');

const router = express.Router();

router.post('/send', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { recipients, message, sender } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    if (!recipients) {
      return res.status(400).json({ error: 'recipients is required' });
    }

    const result = await SmsService.sendSMS({ recipients, message, sender });
    res.json({ status: 'success', result });
  } catch (error) {
    console.error('SMS send error:', error.response?.data || error.message || error);
    res.status(500).json({
      error: 'Failed to send SMS',
      details: error.response?.data || error.message,
    });
  }
});

module.exports = router;
