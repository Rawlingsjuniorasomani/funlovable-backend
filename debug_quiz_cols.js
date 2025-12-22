require('dotenv').config();
const pool = require('./src/db/pool');

async function check() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quizzes'
        `);
        const cols = res.rows.map(r => r.column_name);
        console.log("Columns:", cols);

        const missing = ['teacher_id', 'subject_id', 'module_id', 'lesson_id'].filter(c => !cols.includes(c));
        console.log("Missing:", missing);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
check();
