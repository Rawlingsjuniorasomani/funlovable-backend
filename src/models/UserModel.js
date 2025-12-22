const pool = require('../db/pool');

class UserModel {
    static async findByEmail(email) {
        if (!email) return null;
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        return result.rows[0];
    }

    static async findByPhone(phone) {
        const result = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
        return result.rows[0];
    }

    static async findByIdentifier(identifier) {

        const isEmail = identifier.includes('@');
        if (isEmail) {
            return this.findByEmail(identifier);
        } else {
            return this.findByPhone(identifier);
        }
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async create({ name, email, passwordHash, role, phone, isApproved = false, school, age, studentClass }) {
        const result = await pool.query(
            `INSERT INTO users (name, email, password_hash, role, phone, is_approved, school, age, student_class)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, name, email, role, is_approved, created_at, school, age, student_class`,
            [name, email, passwordHash, role, phone, isApproved, school, age, studentClass]
        );
        return result.rows[0];
    }

    static async updateOnboardingStatus(userId, status) {
        const result = await pool.query(
            'UPDATE users SET is_onboarded = $1 WHERE id = $2 RETURNING *',
            [status, userId]
        );
        return result.rows[0];
    }

    static async update(userId, updates) {
        // dynamic update query
        const keys = Object.keys(updates);
        if (keys.length === 0) return null;

        const values = Object.values(updates);
        const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

        const result = await pool.query(
            `UPDATE users SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
            [...values, userId]
        );
        return result.rows[0];
    }
}

module.exports = UserModel;
