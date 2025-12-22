const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./src/db/pool');

async function checkSchema() {
    try {
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('quizzes', 'lessons')
            ORDER BY table_name, ordinal_position
        `);
        console.log('Columns:', res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}
checkSchema();
