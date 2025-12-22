const express = require('express');
const AssignmentController = require('../controllers/AssignmentController');
const { authMiddleware, requireRole, requireSubscription } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, AssignmentController.getAll);
router.get('/subject/:subjectId', authMiddleware, AssignmentController.getBySubject);
router.post('/', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.create);
router.put('/:id', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.update);
router.delete('/:id', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.delete);


router.post('/:id/questions', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.addQuestion);
router.get('/:id/questions', authMiddleware, AssignmentController.getQuestions);
router.put('/questions/:questionId', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.updateQuestion);
router.delete('/questions/:questionId', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.deleteQuestion);


router.post('/answers', authMiddleware, requireRole(['student']), AssignmentController.saveAnswer);
router.post('/:id/submit', authMiddleware, requireRole(['student']), AssignmentController.submit);
router.get('/:id/my-submission', authMiddleware, requireRole(['student']), AssignmentController.getMySubmission);
router.get('/:id/submissions', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.getSubmissions);
router.post('/submissions/:submissionId/grade', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.gradeSubmission);
router.get('/submissions/:submissionId/answers', authMiddleware, requireRole(['teacher', 'admin']), AssignmentController.getAnswers);

module.exports = router;
