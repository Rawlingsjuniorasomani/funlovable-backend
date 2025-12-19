const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const pool = require('../src/db/pool');

async function checkLatestUsers() {
    try {
        const res = await pool.query(`
            SELECT id, name, email, role, created_at 
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkLatestUsers();
