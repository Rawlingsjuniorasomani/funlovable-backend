const pool = require('../db/pool');

class PlanModel {
    static async findAll() {
        const result = await pool.query(`
            SELECT 
                id,
                plan_name,
                price,
                duration_days,
                features,
                description,
                paystack_plan_code
            FROM plans
            ORDER BY price ASC
        `);

        return result.rows.map(row => ({
            id: row.id,
            name: row.plan_name,
            price: Number(row.price),
            durationDays: row.duration_days,
            duration: row.duration_days === 120 ? 'Termly' : row.duration_days === 365 ? 'Yearly' : `${row.duration_days} days`,
            features: Array.isArray(row.features) ? row.features : (row.features || []),
            description: row.description,
            paystack_plan_code: row.paystack_plan_code,
            recommended: Number(row.price) === 1300
        }));
    }

    static async findById(id) {
        const result = await pool.query(
            `SELECT id, plan_name, price, duration_days, features, description, paystack_plan_code FROM plans WHERE id = $1`,
            [id]
        );
        const row = result.rows[0];
        if (!row) return null;
        return {
            id: row.id,
            name: row.plan_name,
            price: Number(row.price),
            durationDays: row.duration_days,
            duration: row.duration_days === 120 ? 'Termly' : row.duration_days === 365 ? 'Yearly' : `${row.duration_days} days`,
            features: Array.isArray(row.features) ? row.features : (row.features || []),
            description: row.description,
            paystack_plan_code: row.paystack_plan_code,
            recommended: Number(row.price) === 1300
        };
    }

    static async create({ id, name, price, duration, features, recommended, description, paystack_plan_code }) {
        const planName = name;
        const durationDays = typeof duration === 'number' ? duration : null;
        const result = await pool.query(
            `INSERT INTO plans (id, plan_name, price, duration_days, features, description, paystack_plan_code)
             VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5::jsonb, $6, $7)
             RETURNING id`,
            [id || null, planName, price, durationDays, JSON.stringify(features || []), description || null, paystack_plan_code || null]
        );
        return this.findById(result.rows[0].id);
    }

    static async update(id, updates) {
        const mapped = { ...updates };
        if (Object.prototype.hasOwnProperty.call(mapped, 'name')) {
            mapped.plan_name = mapped.name;
            delete mapped.name;
        }
        if (Object.prototype.hasOwnProperty.call(mapped, 'durationDays')) {
            mapped.duration_days = mapped.durationDays;
            delete mapped.durationDays;
        }
        if (Object.prototype.hasOwnProperty.call(mapped, 'features') && mapped.features && typeof mapped.features !== 'string') {
            mapped.features = JSON.stringify(mapped.features);
        }

        const fields = Object.keys(mapped);
        const values = Object.values(mapped);

        if (fields.length === 0) return null;

        const setClause = fields
            .map((field, index) => {
                if (field === 'features') return `${field} = $${index + 2}::jsonb`;
                return `${field} = $${index + 2}`;
            })
            .join(', ');

        const result = await pool.query(
            `UPDATE plans SET ${setClause} WHERE id = $1 RETURNING id`,
            [id, ...values]
        );
        if (result.rows.length === 0) return null;
        return this.findById(result.rows[0].id);
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM plans WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}

module.exports = PlanModel;
