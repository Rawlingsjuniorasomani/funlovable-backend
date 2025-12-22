const express = require('express');
const GradesController = require('../controllers/GradesController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { requireStudentAccess } = require('../middleware/authorization');

const router = express.Router();


router.post('/', authMiddleware, requireRole(['teacher', 'admin']), GradesController.createGrade);


router.get('/student/:studentId', authMiddleware, requireStudentAccess('studentId'), GradesController.getStudentGrades);


router.put('/:id', authMiddleware, requireRole(['teacher', 'admin']), GradesController.updateGrade);


router.delete('/:id', authMiddleware, requireRole(['teacher', 'admin']), GradesController.deleteGrade);


router.post('/report-cards', authMiddleware, requireRole(['teacher', 'admin']), GradesController.generateReportCard);


router.get('/report-cards/:studentId/:term/:academicYear', authMiddleware, requireStudentAccess('studentId'), GradesController.getReportCard);


router.post('/report-cards/:id/publish', authMiddleware, requireRole(['teacher', 'admin']), GradesController.publishReportCard);

module.exports = router;
