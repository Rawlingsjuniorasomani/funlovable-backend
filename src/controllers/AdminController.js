const pool = require('../db/pool');

class AdminController {
    static async getStats(req, res) {
        try {
            
            const [
                usersCount,
                teachersCount,
                parentsCount,
                studentsCount,
                subjectsCount,
                revenueResult
            ] = await Promise.all([
                pool.query('SELECT COUNT(*) FROM users'),
                pool.query("SELECT COUNT(*) FROM users WHERE role = 'teacher'"),
                pool.query("SELECT COUNT(*) FROM users WHERE role = 'parent'"),
                pool.query("SELECT COUNT(*) FROM users WHERE role = 'student'"),
                pool.query('SELECT COUNT(*) FROM subjects'),
                pool.query("SELECT SUM(amount) FROM payments WHERE status = 'success'") 
            ]);

            const stats = {
                totalUsers: parseInt(usersCount.rows[0].count),
                totalTeachers: parseInt(teachersCount.rows[0].count),
                totalParents: parseInt(parentsCount.rows[0].count),
                totalStudents: parseInt(studentsCount.rows[0].count),
                totalSubjects: parseInt(subjectsCount.rows[0].count),
                totalRevenue: parseFloat(revenueResult.rows[0].sum || 0).toFixed(2)
            };

            res.json(stats);
        } catch (error) {
            console.error('Get admin stats error:', error);
            res.status(500).json({ error: 'Failed to get dashboard stats' });
        }
    }
}

module.exports = AdminController;
