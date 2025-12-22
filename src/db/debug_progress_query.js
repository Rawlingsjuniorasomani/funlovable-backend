require('dotenv').config();
const pool = require('./pool');

async function debugProgress() {
    const client = await pool.connect();
    try {
        const childId = '771fe18f-5c27-4e3b-9c31-d1508eca4f0e';
        console.log(`Testing progress query for child: ${childId}`);

        
        console.log('\n--- Subjects Stats Query ---');
        const subjectsRes = await client.query(`
        SELECT s.name as subject, 
               COUNT(distinct qa.id) as quizzes_taken,
               AVG(qa.score) as avg_score
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN modules m ON q.module_id = m.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE qa.user_id = $1
        GROUP BY s.name
    `, [childId]);
        console.log('Rows:', subjectsRes.rows);

        
        console.log('\n--- Recent Activity Query ---');
        const activityRes = await client.query(`
        SELECT qa.id, 'quiz' as type, q.title, s.name as subject, qa.score, qa.completed_at as date
        FROM quiz_attempts qa
        JOIN quizzes q ON qa.quiz_id = q.id
        JOIN modules m ON q.module_id = m.id
        JOIN subjects s ON m.subject_id = s.id
        WHERE qa.user_id = $1
        ORDER BY qa.completed_at DESC
        LIMIT 10
    `, [childId]);
        console.log('Rows:', activityRes.rows);

    } catch (err) {
        console.error('Query Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

debugProgress();
