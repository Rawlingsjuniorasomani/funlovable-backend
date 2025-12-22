require('dotenv').config();
const pool = require('./src/db/pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding teacher_id to quizzes table...');
        await client.query(`
            ALTER TABLE quizzes 
            ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES users(id) ON DELETE SET NULL
        `);

        await client.query('COMMIT');
        console.log('Migration successful.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
