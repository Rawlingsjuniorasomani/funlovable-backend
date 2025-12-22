const path = require('path');
const dotenvPath = path.join(__dirname, '../.env');
const result = require('dotenv').config({ path: dotenvPath });

if (result.error) {
    console.log('Error loading .env:', result.error);
} else {
    console.log('.env loaded from:', dotenvPath);
}

console.log('DATABASE_URL starts with:', process.env.DATABASE_URL ? process.env.DATABASE_URL.substring(0, 20) : 'UNDEFINED');

const pool = require('./db/pool');

async function checkTables() {
    console.log('Pool config:', {
        connectionString: process.env.DATABASE_URL ? 'SET' : 'MISSING',
        ssl: 'ENABLED'
    });
    try {
        const res = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `);
        console.log('Tables:', res.rows.map(r => r.table_name));

        const ts = await pool.query("SELECT * FROM information_schema.tables WHERE table_name = 'teacher_subjects'");
        if (ts.rows.length === 0) {
            console.log('❌ teacher_subjects table MISSING');

            
            await pool.query(`
                CREATE TABLE IF NOT EXISTS teacher_subjects (
                    teacher_id UUID REFERENCES users(id) ON DELETE CASCADE,
                    subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
                    PRIMARY KEY (teacher_id, subject_id)
                );
            `);
            console.log('✅ teacher_subjects table created');
        } else {
            console.log('✅ teacher_subjects table exists');
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkTables();
