const pool = require('../db/pool');

class NotificationModel {
    static async create({ user_id, type, title, description, message, related_id }) {
        
        const msg = message || description;
        const result = await pool.query(`
            INSERT INTO notifications (user_id, type, title, message, related_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `, [user_id, type, title, msg, related_id]);
        return result.rows[0];
    }

    static async getAll() {
        const result = await pool.query(`
            SELECT * FROM notifications ORDER BY created_at DESC
        `);
        return result.rows;
    }

    static async getByUser(user_id) {
        const result = await pool.query(`
            SELECT * FROM notifications 
            WHERE user_id = $1 
            ORDER BY created_at DESC
        `, [user_id]);
        return result.rows;
    }

    static async getUnread(user_id) {
        
        let query = 'SELECT * FROM notifications WHERE is_read = false';
        const params = [];
        if (user_id) {
            params.push(user_id);
            query += ` AND user_id = $${params.length}`;
        }
        query += ' ORDER BY created_at DESC';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async markAsRead(id) {
        const result = await pool.query(`
            UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *
        `, [id]);
        return result.rows[0];
    }

    static async markAllAsRead(user_id) {
        let query = 'UPDATE notifications SET is_read = true';
        const params = [];
        if (user_id) {
            params.push(user_id);
            query += ` WHERE user_id = $${params.length}`;
        }
        query += ' RETURNING *';
        const result = await pool.query(query, params);
        return result.rows;
    }

    static async delete(id) {
        await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
        return true;
    }

    static async clearAll() {
        await pool.query('DELETE FROM notifications');
        return true;
    }
}

module.exports = NotificationModel;
