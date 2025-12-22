require('dotenv').config();
const pool = require('./src/db/pool');

async function updatePlan() {
    try {
        // Update 'Single Child' to 30 days
        const res = await pool.query(`
            UPDATE plans 
            SET duration_days = 30, description = 'Monthly access for one child.'
            WHERE plan_name = 'Single Child'
            RETURNING *
        `);
        console.log('Updated Plan:', res.rows[0]);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

updatePlan();
