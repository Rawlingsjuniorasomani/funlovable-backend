require('dotenv').config();
const pool = require('./src/db/pool');

async function inspectConstraints() {
    try {
        const res = await pool.query(`
            SELECT column_name, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'assignment_questions'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
inspectConstraints();
