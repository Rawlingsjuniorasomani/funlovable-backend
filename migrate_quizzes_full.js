require('dotenv').config();
const pool = require('./src/db/pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const columns = [
            { name: 'pass_mark', type: 'INTEGER DEFAULT 60' },
            { name: 'randomize_questions', type: 'BOOLEAN DEFAULT false' },
            { name: 'max_attempts', type: 'INTEGER DEFAULT 1' },
            { name: 'allow_review', type: 'BOOLEAN DEFAULT true' }
        ];

        for (const col of columns) {
            const check = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'quizzes' AND column_name = $1
            `, [col.name]);

            if (check.rows.length === 0) {
                console.log(`Adding ${col.name} to quizzes table...`);
                await client.query(`
                    ALTER TABLE quizzes 
                    ADD COLUMN ${col.name} ${col.type}
                `);
            } else {
                console.log(`Column ${col.name} already exists.`);
            }
        }

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
