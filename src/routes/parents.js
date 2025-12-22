const express = require('express');
const ParentController = require('../controllers/ParentController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/children', authMiddleware, requireRole(['parent']), ParentController.addChild);
router.get('/children', authMiddleware, requireRole(['parent']), ParentController.getChildren);
router.get('/child/:childId/progress', authMiddleware, requireRole(['parent']), ParentController.getChildProgress);
router.get('/child/:childId/subjects/:subjectId/modules', authMiddleware, requireRole(['parent']), ParentController.getChildModules);
router.get('/child/:childId/modules/:moduleId/lessons', authMiddleware, requireRole(['parent']), ParentController.getChildLessons);

module.exports = router;
