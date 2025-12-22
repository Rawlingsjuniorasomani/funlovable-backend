const pool = require('../db/pool');



const requireStudentAccess = (paramName = 'studentId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Authentication required' });

      const studentId = req.params[paramName];
      if (!studentId) return res.status(400).json({ error: 'Student id required' });

      
      if (String(req.user.role).toLowerCase() === 'admin' || req.user.is_super_admin) return next();

      
      if (String(req.user.id) === String(studentId) && String(req.user.role).toLowerCase() === 'student') return next();

      
      if (String(req.user.role).toLowerCase() === 'parent') {
        const rel = await pool.query('SELECT 1 FROM parent_children WHERE parent_id = $1 AND child_id = $2', [req.user.id, studentId]);
        if (rel.rows.length > 0) return next();
      }

      
      if (String(req.user.role).toLowerCase() === 'teacher') {
        const rel = await pool.query(
          `SELECT 1 FROM student_subjects ss
           JOIN subjects s ON ss.subject_id = s.id
           JOIN teacher_subjects ts ON ts.subject_id = s.id
           WHERE ss.student_id = $1 AND ts.teacher_id = $2 LIMIT 1`,
          [studentId, req.user.id]
        );
        if (rel.rows.length > 0) return next();
      }

      return res.status(403).json({ error: 'Insufficient permissions to access this student' });
    } catch (error) {
      console.error('requireStudentAccess error:', error);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

module.exports = { requireStudentAccess };
