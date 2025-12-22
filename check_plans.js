const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./src/db/pool');

async function checkPlans() {
    try {
        const res = await pool.query('SELECT * FROM plans');
        console.log('Plans:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkPlans();
