const pool = require('../db/pool');

class NotificationService {
    static async createNotification({ user_id, title, message, type, related_id }) {
        const result = await pool.query(`
            INSERT INTO notifications (user_id, title, message, type, related_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, title, message, type, related_id]);
        return result.rows[0];
    }

    static async notifyClass({ subject_id, title, message, type, related_id, exclude_user_id }) {
        
        
        
        
        
        
        const students = await pool.query(`
            SELECT student_id FROM student_subjects WHERE subject_id = $1
        `, [subject_id]);

        const notifications = students.rows.map(s => ({
            user_id: s.student_id,
            title,
            message,
            type,
            related_id
        }));

        
        for (const n of notifications) {
            if (n.user_id !== exclude_user_id) {
                await this.createNotification(n);
            }
        }
    }
}

module.exports = NotificationService;
