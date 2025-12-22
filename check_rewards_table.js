require('dotenv').config();
const pool = require('./src/db/pool');

async function check() {
    try {
        const res = await pool.query("SELECT to_regclass('public.rewards') as table_exists");
        console.log('Rewards table exists:', res.rows[0].table_exists !== null);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
