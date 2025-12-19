const pool = require('../db/pool');

class PendingRegistrationModel {
  static async create({ reference, email, role, plan_id, amount, currency = 'GHS', status = 'pending', paystack_access_code = null, payload = {} }) {
    const result = await pool.query(
      `INSERT INTO pending_registrations (
        reference,
        email,
        role,
        plan_id,
        amount,
        currency,
        status,
        paystack_access_code,
        payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
      RETURNING *`,
      [reference, email, role, plan_id, amount, currency, status, paystack_access_code, JSON.stringify(payload || {})]
    );

    return result.rows[0];
  }

  static async findByReference(reference) {
    const result = await pool.query('SELECT * FROM pending_registrations WHERE reference = $1', [reference]);
    return result.rows[0];
  }

  static async updateStatus(reference, status) {
    const result = await pool.query(
      'UPDATE pending_registrations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE reference = $2 RETURNING *',
      [status, reference]
    );
    return result.rows[0];
  }
}

module.exports = PendingRegistrationModel;
