const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();


router.get('/my-students', authMiddleware, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const teacherId = req.user.id;

        const query = `
            SELECT DISTINCT
                u.id, 
                u.name, 
                u.email, 
                u.avatar, 
                u.school, 
                u.student_class,
                u.is_approved,
                u.created_at,
                (SELECT AVG(percentage) FROM quiz_attempts qa WHERE qa.user_id = u.id) as avg_score,
                (SELECT COUNT(*) FROM user_progress up WHERE up.user_id = u.id AND up.is_completed = true) as completed_lessons,
                STRING_AGG(DISTINCT s.name, ', ') as enrolled_subjects
            FROM users u
            JOIN student_subjects ss ON u.id = ss.student_id
            JOIN subjects s ON ss.subject_id = s.id
            JOIN teacher_subjects ts ON s.id = ts.subject_id
            WHERE ts.teacher_id = $1 AND u.role = 'student'
            GROUP BY u.id
            ORDER BY u.name ASC;
        `;

        const result = await pool.query(query, [teacherId]);


        const students = result.rows.map(std => ({
            ...std,
            avg_score: std.avg_score ? parseFloat(std.avg_score) : 0,
            completed_lessons: parseInt(std.completed_lessons) || 0
        }));

        res.json(students);
    } catch (error) {
        console.error('Get my students error:', error);
        res.status(500).json({ error: 'Failed to fetch students' });
    }
});

module.exports = router;
