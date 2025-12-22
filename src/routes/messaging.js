const express = require('express');
const MessagingController = require('../controllers/MessagingController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();


router.post('/send', authMiddleware, MessagingController.sendMessage);


router.get('/inbox', authMiddleware, MessagingController.getInbox);


router.get('/sent', authMiddleware, MessagingController.getSent);


router.post('/:id/read', authMiddleware, MessagingController.markAsRead);


router.post('/announcements', authMiddleware, requireRole(['teacher', 'admin']), MessagingController.createAnnouncement);


router.get('/announcements', authMiddleware, MessagingController.getAnnouncements);

module.exports = router;
