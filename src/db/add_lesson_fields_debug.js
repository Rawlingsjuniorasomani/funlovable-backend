const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'elearning',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function migrate() {
    console.log('Connecting to DB at ' + process.env.DB_HOST);
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
