const express = require('express');
const ModuleController = require('../controllers/ModuleController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();





router.get('/', authMiddleware, ModuleController.getAll);
router.get('/subject/:subjectId', authMiddleware, ModuleController.getBySubject);

router.post('/', authMiddleware, requireRole(['admin', 'teacher']), ModuleController.create);
router.put('/:id', authMiddleware, requireRole(['admin', 'teacher']), ModuleController.update);
router.delete('/:id', authMiddleware, requireRole(['admin', 'teacher']), ModuleController.delete);

module.exports = router;
