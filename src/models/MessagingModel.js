const pool = require('../db/pool');

class MessagingModel {
    static async sendMessage(data) {
        const { sender_id, recipient_id, message } = data;

        const result = await pool.query(`
            INSERT INTO messages (sender_id, receiver_id, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [sender_id, recipient_id, message]);

        return result.rows[0];
    }

    static async getInbox(userId) {
        const result = await pool.query(`
            SELECT m.*, 
                   u.name as sender_name, 
                   u.email as sender_email,
                   u.role as sender_role
            FROM messages m
            JOIN users u ON m.sender_id::text = u.id::text
            WHERE m.receiver_id::text = $1::text
            ORDER BY m.created_at DESC
        `, [userId]);

        return result.rows;
    }

    static async getSent(userId) {
        const result = await pool.query(`
            SELECT m.*, 
                   u.name as recipient_name, 
                   u.email as recipient_email
            FROM messages m
            LEFT JOIN users u ON m.receiver_id::text = u.id::text
            WHERE m.sender_id::text = $1::text
            ORDER BY m.created_at DESC
        `, [userId]);

        return result.rows;
    }

    static async markAsRead(messageId) {
        const result = await pool.query(`
            UPDATE messages SET is_read = true WHERE id = $1 RETURNING *
        `, [messageId]);

        return result.rows[0];
    }

    static async createAnnouncement(data) {
        const { teacher_id, subject_id, class_name, title, content, priority } = data;

        const result = await pool.query(`
            INSERT INTO class_announcements (teacher_id, subject_id, class_name, title, content, priority)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [teacher_id, subject_id, class_name, title, content, priority || 'normal']);

        return result.rows[0];
    }

    static async getAnnouncements(filters = {}) {
        let query = `
            SELECT a.*, 
                   u.name as teacher_name,
                   s.name as subject_name
            FROM class_announcements a
            JOIN users u ON a.teacher_id::text = u.id::text
            LEFT JOIN subjects s ON a.subject_id = s.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (filters.subject_id) {
            query += ` AND a.subject_id = $${paramIndex++}`;
            params.push(filters.subject_id);
        }

        if (filters.class_name) {
            query += ` AND a.class_name = $${paramIndex++}`;
            params.push(filters.class_name);
        }

        query += ' ORDER BY a.created_at DESC LIMIT 50';

        const result = await pool.query(query, params);
        return result.rows;
    }
}

module.exports = MessagingModel;
