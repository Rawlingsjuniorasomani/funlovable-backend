const express = require('express');
const pool = require('../db/pool');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();

// Replace all assigned subjects for a teacher
router.put('/teachers/:teacherId/subjects', authMiddleware, requireRole(['admin']), async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { subjectIds } = req.body;

    if (!Array.isArray(subjectIds)) {
      return res.status(400).json({ error: 'subjectIds must be an array' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validate teacher
      const teacherCheck = await client.query('SELECT id FROM users WHERE id = $1 AND role = $2', [teacherId, 'teacher']);
      if (teacherCheck.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Teacher not found' });
      }

      // Remove existing assignments
      await client.query('DELETE FROM teacher_subjects WHERE teacher_id = $1', [teacherId]);

      // Insert new assignments
      for (const subjectId of subjectIds) {
        if (typeof subjectId !== 'string' || subjectId.length < 10) continue;
        await client.query(
          `INSERT INTO teacher_subjects (teacher_id, subject_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [teacherId, subjectId]
        );
      }

      await client.query('COMMIT');

      const result = await pool.query(
        `SELECT ts.subject_id, s.name
         FROM teacher_subjects ts
         JOIN subjects s ON s.id = ts.subject_id
         WHERE ts.teacher_id = $1
         ORDER BY s.name ASC`,
        [teacherId]
      );

      res.json({ teacherId, subjects: result.rows });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Assign teacher subjects error:', error);
    res.status(500).json({ error: 'Failed to assign subjects' });
  }
});

module.exports = router;
