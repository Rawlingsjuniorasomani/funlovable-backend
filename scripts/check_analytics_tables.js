require('dotenv').config();
const pool = require('../src/db/pool');

async function checkAnalyticsTables() {
    try {
        const tables = ['user_xp', 'user_achievements', 'quiz_attempts', 'user_progress', 'payments', 'lessons', 'modules', 'subjects', 'quizzes'];

        for (const table of tables) {
            const res = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);

            console.log(`Table '${table}' exists:`, res.rows[0].exists);

            if (res.rows[0].exists) {
                // Check columns for user_progress
                if (table === 'user_progress') {
                    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'user_progress'`);
                    console.log('user_progress columns:', cols.rows.map(c => c.column_name));
                }
            }
        }

    } catch (err) {
        console.error('Error checking tables:', err);
    } finally {
        pool.end();
    }
}

checkAnalyticsTables();
