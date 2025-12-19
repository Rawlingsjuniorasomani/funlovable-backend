const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/db/pool');

async function debugState() {
    try {
        console.log('🔍 Checking Database State...');

        // 1. Check DB Time
        const timeRes = await pool.query('SELECT NOW() as db_time');
        console.log('🕒 DB Time:', timeRes.rows[0].db_time);

        // 2. Check Users created in last 24h
        const usersRes = await pool.query(`
            SELECT id, email, role, created_at 
            FROM users 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
        `);
        console.log('busters (Last 24h):', JSON.stringify(usersRes.rows, null, 2));

        // 3. Check Pending Registrations in last 24h
        const pendingRes = await pool.query(`
            SELECT reference, email, role, status, created_at 
            FROM pending_registrations 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
        `);
        console.log('📝 Pending Registrations (Last 24h):', JSON.stringify(pendingRes.rows, null, 2));

        // 4. Check Payments in last 24h
        const paymentsRes = await pool.query(`
            SELECT reference, amount, status, created_at 
            FROM payments 
            WHERE created_at > NOW() - INTERVAL '24 hours'
            ORDER BY created_at DESC
        `);
        console.log('💰 Payments (Last 24h):', JSON.stringify(paymentsRes.rows, null, 2));

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

debugState();
