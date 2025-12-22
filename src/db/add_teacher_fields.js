require('dotenv').config();
const pool = require('./pool');

async function migrate() {
    try {
        console.log('🔄 Running migration: Add teacher fields...');

        
        await pool.query(`
            ALTER TABLE teachers 
            ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
            ADD COLUMN IF NOT EXISTS school VARCHAR(255),
            ADD COLUMN IF NOT EXISTS address TEXT;
        `);

        console.log('✅ Migration successful: Added years_of_experience, school, address to teachers.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
