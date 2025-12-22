require('dotenv').config();
const pool = require('./src/db/pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Adding profile columns to users table...');

        // Add bio
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bio') THEN 
                    ALTER TABLE users ADD COLUMN bio TEXT; 
                END IF;
            END $$;
        `);

        // Add department
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='department') THEN 
                    ALTER TABLE users ADD COLUMN department TEXT; 
                END IF;
            END $$;
        `);

        // Add subjects_taught
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='subjects_taught') THEN 
                    ALTER TABLE users ADD COLUMN subjects_taught TEXT; 
                END IF;
            END $$;
        `);

        // Add employee_id
        await client.query(`
            DO $$ 
            BEGIN 
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='employee_id') THEN 
                    ALTER TABLE users ADD COLUMN employee_id TEXT; 
                END IF;
            END $$;
        `);

        console.log('Profile columns added successfully.');
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
