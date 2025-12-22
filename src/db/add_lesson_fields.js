const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function migrate() {
    console.log('Database URL:', process.env.DATABASE_URL ? 'Loaded' : 'Not Loaded');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding fields to lessons table...');

        
        await client.query(`
            ALTER TABLE lessons 
            ADD COLUMN IF NOT EXISTS topic VARCHAR(255),
            ADD COLUMN IF NOT EXISTS learning_objectives TEXT,
            ADD COLUMN IF NOT EXISTS student_class VARCHAR(50),
            ADD COLUMN IF NOT EXISTS attachment_url TEXT,
            ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(50),
            ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0
        `);

        await client.query('COMMIT');
        console.log('✅ Lessons table updated successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
