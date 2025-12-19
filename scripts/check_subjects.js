const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('../src/db/pool');

async function checkSubjects() {
    try {
        console.log('🔍 Checking Subjects...');
        const subjects = await pool.query('SELECT id, name FROM subjects ORDER BY name');
        console.log(`Found ${subjects.rows.length} subjects.`);

        for (const sub of subjects.rows) {
            const modRes = await pool.query('SELECT count(*) as count FROM modules WHERE subject_id = $1', [sub.id]);
            const lessonRes = await pool.query(`
                SELECT count(*) as count 
                FROM lessons l
                JOIN modules m ON l.module_id = m.id
                WHERE m.subject_id = $1
            `, [sub.id]);

            console.log(`- ${sub.name} (ID: ${sub.id}): ${modRes.rows[0].count} modules, ${lessonRes.rows[0].count} lessons`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkSubjects();
