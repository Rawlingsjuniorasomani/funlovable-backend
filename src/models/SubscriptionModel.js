const pool = require('../db/pool');

class SubscriptionModel {
    static async create({ user_id, plan_id, amount, status, start_date, expires_at, payment_reference }) {
        // Upsert logic: if exists for parent, update it. If not, insert.
        // Or just insert new history? Usually one active subscription.
        // Let's use INSERT ... ON CONFLICT (parent_id) if parent_id is unique, or just insert new one.
        // If we want history, we insert. If we want current status, we update.
        // Let's assume one active record per parent for simplicity or creating new one.
        // Given previous logic 'UPDATE users set subscription...', we want to move to 'subscriptions' table.
        // Let's insert new record.
        const result = await pool.query(
            `INSERT INTO subscriptions (user_id, plan, amount, status, starts_at, expires_at, payment_reference)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
            [user_id, plan_id, amount, status, start_date, expires_at, payment_reference]
        );
        return result.rows[0];
    }

    static async deactivateActive(userId) {
        await pool.query(
            "UPDATE subscriptions SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND status = 'active'",
            [userId]
        );
    }

    static async findByParent(user_id) {
        // Get the latest or active one
        const result = await pool.query(
            'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [user_id]
        );
        return result.rows[0];
    }

    static async updateStatus(user_id, status) {
        const result = await pool.query(
            "UPDATE subscriptions SET status = $1 WHERE user_id = $2 AND status = 'active' RETURNING *",
            [status, user_id]
        );
        return result.rows[0];
    }
}

module.exports = SubscriptionModel;
