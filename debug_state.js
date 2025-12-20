require('dotenv').config();
const pool = require('./src/db/pool');

async function debugState() {
    try {
        console.log('--- DEBUGGING DB STATE ---');

        // 1. Check Plans
        const plans = await pool.query('SELECT id, plan_name, price FROM plans');
        console.log('\nPlans Table:', plans.rows);

        // 2. Check Recent Users
        const users = await pool.query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5');
        console.log('\nRecent Users:', users.rows);

        // 3. Check Pending Registrations
        const pending = await pool.query('SELECT reference, email, role, status, payload FROM pending_registrations ORDER BY created_at DESC LIMIT 5');
        console.log('\nRecent Pending Registrations:', pending.rows.map(r => ({
            ref: r.reference,
            email: r.email,
            status: r.status,
            childPayload: r.payload?.child ? 'Present' : 'Missing'
        })));

    } catch (e) {
        console.error('Debug Error:', e);
    } finally {
        pool.end();
    }
}

debugState();
