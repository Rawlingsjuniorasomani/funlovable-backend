const pool = require('./src/db/pool');

async function inspectPlans() {
    try {
        const res = await pool.query('SELECT * FROM plans');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

inspectPlans();
