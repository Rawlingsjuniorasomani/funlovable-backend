const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');


router.get('/', authMiddleware, async (req, res) => {
    try {
        const { subject_id, teacher_id, status } = req.query;
        let query = `
      SELECT lc.*, s.name as subject_name, u.name as teacher_name
      FROM live_classes lc
      LEFT JOIN subjects s ON lc.subject_id = s.id
      LEFT JOIN users u ON lc.teacher_id = u.id
      WHERE 1=1
    `;
        const params = [];

        if (subject_id) {
            params.push(subject_id);
            query += ` AND lc.subject_id = $${params.length}`;
        }
        if (teacher_id) {
            params.push(teacher_id);
            query += ` AND lc.teacher_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND lc.status = $${params.length}`;
        }

        
        if (req.user.role === 'student') {
            params.push(req.user.id);
            query += ` AND lc.subject_id IN (
                SELECT subject_id FROM student_subjects WHERE student_id = $${params.length}
            )`;
        }

        query += ' ORDER BY lc.scheduled_at ASC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get live classes error:', error);
        res.status(500).json({ error: 'Failed to fetch live classes', details: error.message });
    }
});


router.post('/', authMiddleware, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        const { title, description, subject_id, scheduled_at, duration_minutes, meeting_url } = req.body;

        
        
        let teacher_id = req.user.id;

        
        if (req.user.role === 'admin' && req.body.teacher_id) {
            teacher_id = req.body.teacher_id;
        }

        const result = await pool.query(`
      INSERT INTO live_classes (title, description, subject_id, teacher_id, scheduled_at, duration_minutes, status, meeting_url)
      VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
      RETURNING *
    `, [title, description, subject_id, teacher_id, scheduled_at, duration_minutes, meeting_url]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create live class error:', error);
        res.status(500).json({ error: 'Failed to create live class' });
    }
});


router.put('/:id/status', authMiddleware, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        
        if (req.user.role === 'teacher') {
            const ownerCheck = await pool.query(
                'SELECT teacher_id FROM live_classes WHERE id = $1',
                [req.params.id]
            );
            if (ownerCheck.rows.length === 0 || String(ownerCheck.rows[0].teacher_id) !== String(req.user.id)) {
                return res.status(403).json({ error: 'Unauthorized: not your class' });
            }
        }

        const { status } = req.body; 
        const result = await pool.query(`
      UPDATE live_classes
      SET status = $1
      WHERE id = $2
      RETURNING *
    `, [status, req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({ error: 'Failed to update status' });
    }
});


router.delete('/:id', authMiddleware, requireRole(['teacher', 'admin']), async (req, res) => {
    try {
        
        if (req.user.role === 'teacher') {
            const ownerCheck = await pool.query(
                'SELECT teacher_id FROM live_classes WHERE id = $1',
                [req.params.id]
            );
            if (ownerCheck.rows.length === 0 || String(ownerCheck.rows[0].teacher_id) !== String(req.user.id)) {
                return res.status(403).json({ error: 'Unauthorized: not your class' });
            }
        }

        const result = await pool.query('DELETE FROM live_classes WHERE id = $1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Class not found' });
        }
        res.json({ message: 'Class deleted' });
    } catch (error) {
        console.error('Delete class error:', error);
        res.status(500).json({ error: 'Failed to delete class' });
    }
});

module.exports = router;
