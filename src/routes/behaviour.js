const express = require('express');
const BehaviourController = require('../controllers/BehaviourController');
const { authMiddleware, requireRole } = require('../middleware/auth');
const { requireStudentAccess } = require('../middleware/authorization');

const router = express.Router();


router.post('/', authMiddleware, requireRole(['teacher', 'admin']), BehaviourController.createRecord);


router.get('/student/:studentId', authMiddleware, requireStudentAccess('studentId'), BehaviourController.getStudentRecords);


router.get('/summary/:studentId', authMiddleware, requireStudentAccess('studentId'), BehaviourController.getSummary);

module.exports = router;
