const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, requireRole, requireSubscription } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');


const uploadDir = path.join(__dirname, '../../uploads/lessons');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } 
});


router.get('/', authMiddleware, async (req, res) => {
    try {
        const { moduleId, teacherId, subjectId } = req.query;
        let query = `
      SELECT l.*, m.title as module_title, s.name as subject_name 
      FROM lessons l
      LEFT JOIN modules m ON l.module_id = m.id
      LEFT JOIN subjects s ON m.subject_id = s.id
      WHERE 1=1
    `;
        const params = [];
        let pIdx = 1;

        if (moduleId) {
            query += ` AND l.module_id = $${pIdx++}`;
            params.push(moduleId);
        }

        if (subjectId) {
            query += ` AND m.subject_id = $${pIdx++}`;
            params.push(subjectId);
        }

        
        const effectiveTeacherId = teacherId || (req.user?.role === 'teacher' ? req.user.id : null);
        if (effectiveTeacherId) {
            
            query += ` AND EXISTS (
                SELECT 1
                FROM teacher_subjects ts
                WHERE ts.subject_id = s.id AND ts.teacher_id = $${pIdx++}
            )`;
            params.push(effectiveTeacherId);
        }

        query += ` ORDER BY l.order_index ASC, l.created_at DESC`;

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Get lessons error:', error);
        res.status(500).json({ error: 'Failed to fetch lessons' });
    }
});


router.get('/:id', authMiddleware, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lesson' });
    }
});


router.post('/', authMiddleware, upload.single('file'), async (req, res) => {
    try {
        
        const {
            module_id,
            title,
            content,
            video_url,
            duration_minutes,
            topic,
            learning_objectives,
            student_class,
            order_index
        } = req.body;

        let attachment_url = null;
        let attachment_type = null;

        if (req.file) {
            attachment_url = `/uploads/lessons/${req.file.filename}`;
            attachment_type = req.file.mimetype;
        }

        
        if (!title || !module_id) {
            return res.status(400).json({ error: 'Title and Module are required' });
        }

        
        if (req.user.role === 'teacher') {
            const modCheck = await pool.query(`
            SELECT ts.teacher_id 
            FROM modules m 
            JOIN subjects s ON m.subject_id = s.id 
            JOIN teacher_subjects ts ON s.id = ts.subject_id
            WHERE m.id = $1 AND ts.teacher_id = $2
        `, [module_id, req.user.id]);

            if (modCheck.rows.length === 0) {
                return res.status(403).json({ error: 'You are not assigned to this subject/module' });
            }
        }

        const result = await pool.query(`
      INSERT INTO lessons (
        module_id, title, content, video_url, duration_minutes, 
        topic, learning_objectives, student_class, 
        attachment_url, attachment_type, order_index
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
            module_id, title, content || '', video_url || '', duration_minutes || 0,
            topic, learning_objectives, student_class,
            attachment_url, attachment_type, order_index || 0
        ]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Create lesson error:', error);
        res.status(500).json({ error: 'Failed to create lesson' });
    }
});


router.put('/:id', authMiddleware, async (req, res) => {
    try {
        
        if (!['teacher', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only teachers can update lessons' });
        }

        
        if (req.user.role === 'teacher') {
            const accessCheck = await pool.query(
                `SELECT 1
                 FROM lessons l
                 JOIN modules m ON l.module_id = m.id
                 JOIN subjects s ON m.subject_id = s.id
                 JOIN teacher_subjects ts ON ts.subject_id = s.id
                 WHERE l.id = $1 AND ts.teacher_id = $2
                 LIMIT 1`,
                [req.params.id, req.user.id]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Unauthorized: not your lesson' });
            }
        }

        const { title, content, video_url, duration_minutes, is_active } = req.body;
        const result = await pool.query(`
      UPDATE lessons 
      SET title = COALESCE($1, title),
          content = COALESCE($2, content),
          video_url = COALESCE($3, video_url),
          duration_minutes = COALESCE($4, duration_minutes),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [title, content, video_url, duration_minutes, is_active, req.params.id]);

        if (result.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update lesson' });
    }
});


router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        
        if (!['teacher', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only teachers can delete lessons' });
        }

        
        if (req.user.role === 'teacher') {
            const accessCheck = await pool.query(
                `SELECT 1
                 FROM lessons l
                 JOIN modules m ON l.module_id = m.id
                 JOIN subjects s ON m.subject_id = s.id
                 JOIN teacher_subjects ts ON ts.subject_id = s.id
                 WHERE l.id = $1 AND ts.teacher_id = $2
                 LIMIT 1`,
                [req.params.id, req.user.id]
            );
            if (accessCheck.rows.length === 0) {
                return res.status(403).json({ error: 'Unauthorized: not your lesson' });
            }
        }

        const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING *', [req.params.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Lesson not found' });
        res.json({ message: 'Lesson deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete lesson' });
    }
});


router.post('/:id/complete', authMiddleware, async (req, res) => {
    try {
        if (req.user.role !== 'student') return res.status(403).json({ error: 'Students only' });

        await pool.query(`
            INSERT INTO progress (user_id, lesson_id, completed, completed_at)
            VALUES ($1, $2, true, CURRENT_TIMESTAMP)
            ON CONFLICT (user_id, lesson_id) DO UPDATE SET completed = true
        `, [req.user.id, req.params.id]);

        res.json({ message: 'Lesson marked as complete' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to complete lesson' });
    }
});

module.exports = router;
