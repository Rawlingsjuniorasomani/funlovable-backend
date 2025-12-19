const express = require('express');
const ModuleController = require('../controllers/ModuleController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get modules by subject (assuming Query param or just handling in controller via different route structure)
// Current logic in frontend often expects /modules?subjectId=... or /subjects/:id/modules
// Let's stick to simple CRUD.

router.get('/', authMiddleware, ModuleController.getAll);
router.get('/subject/:subjectId', authMiddleware, ModuleController.getBySubject);

router.post('/', authMiddleware, requireRole(['admin', 'teacher']), ModuleController.create);
router.put('/:id', authMiddleware, requireRole(['admin', 'teacher']), ModuleController.update);
router.delete('/:id', authMiddleware, requireRole(['admin', 'teacher']), ModuleController.delete);

module.exports = router;
