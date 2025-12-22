const pool = require('../db/pool');

class LiveChatService {
    /**
     * Save a new chat message
     */
    static async saveMessage({ liveClassId, senderId, senderName, senderRole, message, messageType = 'chat' }) {
        const result = await pool.query(
            `INSERT INTO live_class_messages 
       (live_class_id, sender_id, sender_name, sender_role, message, message_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
            [liveClassId, senderId, senderName, senderRole, message, messageType]
        );
        return result.rows[0];
    }

    /**
     * Get recent messages for a class
     */
    static async getMessages(liveClassId, limit = 50) {
        const result = await pool.query(
            `SELECT * FROM live_class_messages 
       WHERE live_class_id = $1 AND is_hidden = false
       ORDER BY created_at ASC
       LIMIT $2`,
            [liveClassId, limit]
        );
        return result.rows;
    }

    /**
     * Toggle Pin Status
     */
    static async togglePin(messageId, isPinned) {
        const result = await pool.query(
            `UPDATE live_class_messages SET is_pinned = $1 WHERE id = $2 RETURNING *`,
            [isPinned, messageId]
        );
        return result.rows[0];
    }

    /**
     * Soft Delete Message (Hide)
     */
    static async deleteMessage(messageId) {
        const result = await pool.query(
            `UPDATE live_class_messages SET is_hidden = true WHERE id = $1 RETURNING *`,
            [messageId]
        );
        return result.rows[0];
    }

    /**
     * Update Class Chat Settings
     */
    static async updateChatSettings(classId, { chatEnabled, questionsOnly }) {
        const updates = [];
        const values = [];
        let counter = 1;

        if (chatEnabled !== undefined) {
            updates.push(`chat_enabled = $${counter++}`);
            values.push(chatEnabled);
        }
        if (questionsOnly !== undefined) {
            updates.push(`questions_only_mode = $${counter++}`);
            values.push(questionsOnly);
        }

        if (updates.length === 0) return null;
        values.push(classId);

        const result = await pool.query(
            `UPDATE live_classes SET ${updates.join(', ')} WHERE id = $${counter} RETURNING chat_enabled, questions_only_mode`,
            values
        );
        return result.rows[0];
    }

    /**
     * Get Class Settings
     */
    static async getClassSettings(classId) {
        const result = await pool.query('SELECT chat_enabled, questions_only_mode FROM live_classes WHERE id = $1', [classId]);
        return result.rows[0];
    }
}

module.exports = LiveChatService;
