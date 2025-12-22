const express = require('express');
const QuizController = require('../controllers/QuizController');
const { authMiddleware, requireRole, requireSubscription } = require('../middleware/auth');

const router = express.Router();


router.get('/', authMiddleware, requireRole(['teacher', 'admin']), QuizController.getAll);
router.post('/', authMiddleware, requireRole(['teacher', 'admin']), QuizController.create);
router.put('/:id', authMiddleware, requireRole(['teacher', 'admin']), QuizController.update);
router.post('/:id/publish', authMiddleware, requireRole(['teacher', 'admin']), QuizController.publish);
router.post('/:id/questions', authMiddleware, requireRole(['teacher', 'admin']), QuizController.addQuestion);
router.get('/:id/questions', authMiddleware, QuizController.getQuestions);
router.put('/questions/:questionId', authMiddleware, requireRole(['teacher', 'admin']), QuizController.updateQuestion);
router.delete('/questions/:questionId', authMiddleware, requireRole(['teacher', 'admin']), QuizController.deleteQuestion);
router.get('/:id/attempts', authMiddleware, requireRole(['teacher', 'admin']), QuizController.getAttempts);
router.put('/answers/:answerId/grade', authMiddleware, requireRole(['teacher', 'admin']), QuizController.gradeAnswer);
router.post('/attempts/:attemptId/release', authMiddleware, requireRole(['teacher', 'admin']), QuizController.releaseResults);
router.put('/attempts/:attemptId/feedback', authMiddleware, requireRole(['teacher', 'admin']), QuizController.updateFeedback);


router.get('/available', authMiddleware, requireRole(['student']), requireSubscription, QuizController.getAvailable);
router.post('/:id/start', authMiddleware, requireRole(['student']), requireSubscription, QuizController.startAttempt);
router.post('/attempts/:attemptId/answers', authMiddleware, requireRole(['student']), requireSubscription, QuizController.saveAnswer);
router.post('/attempts/:attemptId/submit', authMiddleware, requireRole(['student']), requireSubscription, QuizController.submit);
router.get('/attempts/:attemptId/results', authMiddleware, requireSubscription, QuizController.getAttemptResults);


router.get('/subject/:subjectId', authMiddleware, QuizController.getBySubject);
router.get('/:id', authMiddleware, QuizController.getOne);

module.exports = router;
