const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./src/db/pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Starting migration...');

        // 1. Add quiz_passed and quiz_score to user_progress
        console.log('Updating user_progress table...');
        await client.query(`
            ALTER TABLE user_progress 
            ADD COLUMN IF NOT EXISTS quiz_passed BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS quiz_score INTEGER;
        `);

        // 2. Add pass_mark to lessons
        console.log('Updating lessons table...');
        await client.query(`
            ALTER TABLE lessons 
            ADD COLUMN IF NOT EXISTS pass_mark INTEGER DEFAULT 60;
        `);

        // 3. Add lesson_id to quizzes
        // Note: Using lesson_id as a Foreign Key to link Quiz to Lesson.
        console.log('Updating quizzes table...');
        await client.query(`
            ALTER TABLE quizzes 
            ADD COLUMN IF NOT EXISTS lesson_id UUID REFERENCES lessons(id);
        `);

        // Optional: Ensure uniqueness if 1:1 relationship is desired
        // await client.query('ALTER TABLE quizzes ADD CONSTRAINT unique_quiz_lesson UNIQUE (lesson_id);');

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        pool.end();
    }
}

migrate();
