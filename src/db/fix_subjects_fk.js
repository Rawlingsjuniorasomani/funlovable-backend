const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function fixConstraint() {
    const client = await pool.connect();
    try {
        console.log('Starting constraint fix...');

        
        console.log('Dropping old constraint...');
        await client.query('ALTER TABLE subjects DROP CONSTRAINT IF EXISTS subjects_teacher_id_fkey');

        
        console.log('Adding new constraint with ON DELETE SET NULL...');
        await client.query(`
      ALTER TABLE subjects
      ADD CONSTRAINT subjects_teacher_id_fkey
      FOREIGN KEY (teacher_id)
      REFERENCES users(id)
      ON DELETE SET NULL
    `);

        console.log('Constraint updated successfully.');
    } catch (err) {
        console.error('Error fixing constraint:', err);
    } finally {
        client.release();
        pool.end();
    }
}

fixConstraint();
