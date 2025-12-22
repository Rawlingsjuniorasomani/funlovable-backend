require('dotenv').config();
const pool = require('./src/db/pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if column exists
        const check = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'quizzes' AND column_name = 'pass_mark'
        `);

        if (check.rows.length === 0) {
            console.log('Adding pass_mark column to quizzes table...');
            await client.query(`
                ALTER TABLE quizzes 
                ADD COLUMN pass_mark INTEGER DEFAULT 60
            `);
            console.log('Column added successfully.');
        } else {
            console.log('Column pass_mark already exists.');
        }

        await client.query('COMMIT');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
