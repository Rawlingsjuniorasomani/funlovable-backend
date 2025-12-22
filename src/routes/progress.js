const express = require('express');
const ProgressController = require('../controllers/ProgressController');
const { authMiddleware } = require('../middleware/auth');
const { requireStudentAccess } = require('../middleware/authorization');

const router = express.Router();


router.post('/lesson-view', authMiddleware, ProgressController.trackLessonView);


router.get('/student/:studentId', authMiddleware, requireStudentAccess('studentId'), ProgressController.getStudentProgress);


router.get('/analytics/:studentId', authMiddleware, requireStudentAccess('studentId'), ProgressController.getAnalytics);

module.exports = router;
