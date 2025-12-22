
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function addStudentFields() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='school') THEN
          ALTER TABLE users ADD COLUMN school VARCHAR(255);
        END IF;
      END
      $$;
    `);

        
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='age') THEN
          ALTER TABLE users ADD COLUMN age INTEGER;
        END IF;
      END
      $$;
    `);

        
        await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='student_class') THEN
          ALTER TABLE users ADD COLUMN student_class VARCHAR(50);
        END IF;
      END
      $$;
    `);

        await client.query('COMMIT');
        console.log('Successfully added student fields to users table');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding student fields:', error);
    } finally {
        client.release();
        pool.end(); 
    }
}

addStudentFields();
