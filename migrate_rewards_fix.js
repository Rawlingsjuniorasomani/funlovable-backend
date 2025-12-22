require('dotenv').config();
const pool = require('./src/db/pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if rewards table has incorrect columns (e.g. points_required)
        const check = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'rewards' AND column_name = 'points_required'
        `);

        if (check.rows.length > 0) {
            console.log('Renaming incorrect rewards table to reward_catalog...');
            await client.query('ALTER TABLE rewards RENAME TO reward_catalog');
        }

        console.log('Creating correct rewards table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS rewards (
                id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
                student_id UUID REFERENCES users(id) ON DELETE CASCADE,
                teacher_id UUID REFERENCES users(id) ON DELETE SET NULL,
                type VARCHAR(50) NOT NULL,
                name VARCHAR(255) NOT NULL,
                reason TEXT,
                awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
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
