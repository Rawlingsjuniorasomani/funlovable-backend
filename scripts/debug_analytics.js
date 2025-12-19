require('dotenv').config();
const pool = require('../src/db/pool');

async function debugAnalytics() {
    try {
        console.log('Testing Student Analytics Queries...');
        // Mock user ID - need a valid one. Let's fetch one.
        const userRes = await pool.query("SELECT id FROM users WHERE role = 'student' LIMIT 1");
        if (userRes.rows.length === 0) {
            console.log('No student found to test with.');
        } else {
            const userId = userRes.rows[0].id;
            console.log('Testing with student ID:', userId);

            try {
                await pool.query(`
              SELECT 
                COUNT(*) as completed_lessons,
                SUM(time_spent_minutes) as total_time
              FROM user_progress 
              WHERE user_id = $1 AND is_completed = true
            `, [userId]);
                console.log('Progress query: OK');
            } catch (e) { console.error('Progress query FAILED:', e.message); }

            try {
                await pool.query(`
              SELECT 
                COUNT(*) as total_attempts,
                AVG(percentage) as average_score,
                COUNT(CASE WHEN passed THEN 1 END) as quizzes_passed
              FROM quiz_attempts WHERE user_id = $1
            `, [userId]);
                console.log('Quiz stats query: OK');
            } catch (e) { console.error('Quiz stats query FAILED:', e.message); }

            try {
                await pool.query(`
              SELECT 
                l.id as lesson_id,
                l.title,
                m.subject_id
              FROM user_progress up
              INNER JOIN lessons l ON up.lesson_id = l.id
              INNER JOIN modules m ON l.module_id = m.id
              WHERE up.user_id = $1
              ORDER BY up.updated_at DESC LIMIT 1
            `, [userId]);
                console.log('Last played query: OK');
            } catch (e) { console.error('Last played query FAILED:', e.message); }
        }

        console.log('\nTesting Parent Analytics Queries...');
        const parentRes = await pool.query("SELECT id FROM users WHERE role = 'parent' LIMIT 1");
        if (parentRes.rows.length === 0) {
            console.log('No parent found to test with.');
        } else {
            const parentId = parentRes.rows[0].id;
            console.log('Testing with parent ID:', parentId);

            // Test children query
            try {
                const childrenResult = await pool.query(`
              SELECT u.id, u.name, u.avatar, u.student_class as grade
              FROM users u
              INNER JOIN parent_children pc ON u.id = pc.child_id
              WHERE pc.parent_id = $1
            `, [parentId]);
                console.log('Children query: OK', childrenResult.rows.length, 'children found');

                if (childrenResult.rows.length > 0) {
                    const childId = childrenResult.rows[0].id;
                    // Test subject stats query which is complex
                    try {
                        await pool.query(`
                      SELECT 
                        s.name as subject,
                        u.name as child_name,
                        AVG(qa.score) as score
                      FROM quiz_attempts qa
                      JOIN quizzes q ON qa.quiz_id = q.id
                      JOIN modules m ON q.module_id = m.id
                      JOIN subjects s ON m.subject_id = s.id
                      JOIN users u ON qa.user_id = u.id
                      WHERE qa.user_id = ANY($1::uuid[])
                      GROUP BY s.name, u.name
                    `, [[childId]]);
                        console.log('Subject stats query: OK');
                    } catch (e) { console.error('Subject stats query FAILED:', e.message); }
                }
            } catch (e) { console.error('Children query FAILED:', e.message); }
        }

    } catch (err) {
        console.error('Error debugging analytics:', err);
    } finally {
        pool.end();
    }
}

debugAnalytics();
