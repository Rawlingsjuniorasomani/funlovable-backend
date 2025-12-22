require('dotenv').config();
const pool = require('./src/db/pool');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'assignment_questions'
        `);
        const cols = res.rows.map(r => r.column_name);
        console.log("Columns:", cols);

        const required = ['assignment_id', 'question_text', 'question_type', 'options', 'correct_answer', 'marks', 'order_index', 'required', 'media_url'];
        const missing = required.filter(c => !cols.includes(c));
        console.log("Missing:", missing);
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
inspect();
