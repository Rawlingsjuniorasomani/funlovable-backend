const pool = require('../db/pool');

class PaymentModel {
    static async create({
        user_id,
        subscription_id = null,
        amount,
        currency = 'GHS',
        status = 'pending',
        payment_method = 'paystack',
        reference,
        paystack_reference = null,
        metadata = {},
        plan_id = undefined
    }) {
        const finalMetadata = {
            ...(metadata && typeof metadata === 'object' ? metadata : {}),
            ...(plan_id ? { plan_id } : {})
        };

        const result = await pool.query(
            `INSERT INTO payments (
                user_id,
                subscription_id,
                amount,
                currency,
                status,
                payment_method,
                reference,
                paystack_reference,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
            RETURNING *`,
            [user_id, subscription_id, amount, currency, status, payment_method, reference, paystack_reference, JSON.stringify(finalMetadata)]
        );
        return result.rows[0];
    }

    static async findByReference(reference) {
        const result = await pool.query('SELECT * FROM payments WHERE reference = $1', [reference]);
        return result.rows[0];
    }

    static async updateStatus(reference, status) {
        const result = await pool.query(
            'UPDATE payments SET status = $1 WHERE reference = $2 RETURNING *',
            [status, reference]
        );
        return result.rows[0];
    }
    static async findByUser(userId) {
        const result = await pool.query('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        return result.rows;
    }
}

module.exports = PaymentModel;
