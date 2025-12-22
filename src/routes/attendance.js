const express = require('express');
const AttendanceController = require('../controllers/AttendanceController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { requireStudentAccess } = require('../middleware/authorization');

const router = express.Router();


router.post('/mark', authMiddleware, requireRole(['teacher', 'admin']), AttendanceController.markAttendance);
router.post('/bulk-mark', authMiddleware, requireRole(['teacher', 'admin']), AttendanceController.bulkMarkAttendance);


router.get('/student/:studentId', authMiddleware, requireStudentAccess('studentId'), AttendanceController.getStudentAttendance);


router.get('/class/:subjectId', authMiddleware, requireRole(['teacher', 'admin']), AttendanceController.getClassAttendance);


router.get('/stats/:studentId', authMiddleware, requireStudentAccess('studentId'), AttendanceController.getAttendanceStats);

module.exports = router;
