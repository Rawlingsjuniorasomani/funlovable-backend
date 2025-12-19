const express = require('express');
const SubjectController = require('../controllers/SubjectController');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Public get all subjects
router.get('/', SubjectController.getAll);

// Get teacher's subjects
router.get('/my-subjects', authMiddleware, requireRole(['teacher']), SubjectController.getTeacherSubjects);

// Get single subject
router.get('/:id', SubjectController.getOne);

// Admin/Teacher only routes
router.post('/', authMiddleware, requireRole(['admin', 'teacher']), SubjectController.create);
router.put('/:id', authMiddleware, requireRole(['admin', 'teacher']), SubjectController.update);
router.delete('/:id', authMiddleware, requireRole(['admin']), SubjectController.delete);

// Student Enrollment
router.post('/:id/enroll', authMiddleware, requireRole(['student']), async (req, res) => {
    try {
        const studentId = req.user.id;
        const subjectId = req.params.id;

        // Check if already enrolled
        const check = await require('../db/pool').query(
            'SELECT * FROM student_subjects WHERE student_id = $1 AND subject_id = $2',
            [studentId, subjectId]
        );

        if (check.rows.length > 0) {
            return res.json({ message: 'Already enrolled' });
        }

        await require('../db/pool').query(
            'INSERT INTO student_subjects (student_id, subject_id) VALUES ($1, $2)',
            [studentId, subjectId]
        );

        // Notify Teachers
        try {
            const pool = require('../db/pool');
            const NotificationModel = require('../models/NotificationModel');

            // Find teachers for this subject
            const teachersResult = await pool.query(
                'SELECT teacher_id FROM teacher_subjects WHERE subject_id = $1',
                [subjectId]
            );

            const subjectResult = await pool.query('SELECT name FROM subjects WHERE id = $1', [subjectId]);
            const subjectName = subjectResult.rows[0]?.name || 'a subject';
            const studentName = req.user.name;

            const notificationPromises = teachersResult.rows.map(row =>
                NotificationModel.create({
                    user_id: row.teacher_id,
                    type: 'info',
                    title: 'New Student Enrollment',
                    message: `${studentName} has enrolled in your subject: ${subjectName}`,
                    data: { studentId, subjectId }
                })
            );

            await Promise.all(notificationPromises);
        } catch (notifError) {
            console.error('Failed to notify teachers:', notifError);
        }

        res.json({ message: 'Enrolled successfully' });
    } catch (error) {
        console.error('Enroll error:', error);
        res.status(500).json({ error: 'Failed to enroll' });
    }
});

router.get('/student/enrolled', authMiddleware, requireRole(['student']), async (req, res) => {
    try {
        const studentId = req.user.id;
        const result = await require('../db/pool').query(`
            SELECT s.*, 
            (SELECT COUNT(*) FROM lessons l JOIN modules m ON l.module_id = m.id WHERE m.subject_id = s.id) as lesson_count
            FROM subjects s
            JOIN student_subjects ss ON s.id = ss.subject_id
            WHERE ss.student_id = $1
        `, [studentId]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get enrolled error:', error);
        res.status(500).json({ error: 'Failed to fetch enrolled subjects' });
    }
});

module.exports = router;
