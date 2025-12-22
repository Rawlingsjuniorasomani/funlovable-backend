require('dotenv').config();
const pool = require('./pool');

async function debugQuery() {
    const client = await pool.connect();
    try {
        console.log("--- Executing Users Route Query ---");

        
        const query = `
      SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar, u.is_approved, u.is_onboarded, u.created_at,
             u.student_class, u.school,
             MAX(COALESCE(ux.total_xp, 0)) as total_xp, MAX(COALESCE(ux.level, 1)) as level,
             u.subscription_status, u.subscription_end_date,
             (SELECT COUNT(*) FROM parent_children pc WHERE pc.parent_id = u.id)::int as children_count,
             (
                SELECT s.plan
                FROM subscriptions s 
                WHERE s.user_id = u.id AND s.status = 'active' 
                ORDER BY s.created_at DESC 
                LIMIT 1
             ) as plan_name,
             (SELECT AVG(percentage) FROM quiz_attempts qa WHERE qa.user_id = u.id) as avg_quiz_score,
             (SELECT COUNT(*) FROM quiz_attempts qa WHERE qa.user_id = u.id AND qa.passed = true) as completed_quizzes,
             (SELECT COUNT(*) FROM user_progress up WHERE up.user_id = u.id AND up.is_completed = true) as completed_lessons,
              (
                SELECT u2.name 
                FROM parent_children pc2 
                JOIN users u2 ON pc2.parent_id = u2.id 
                WHERE pc2.child_id = u.id
                LIMIT 1
             ) as parent_name,
             STRING_AGG(DISTINCT s.name, ', ') as subjects_list
      FROM users u
      LEFT JOIN teacher_subjects ts ON u.id = ts.teacher_id
      LEFT JOIN subjects s ON ts.subject_id = s.id
      LEFT JOIN user_xp ux ON u.id = ux.user_id
      WHERE 1=1
      GROUP BY u.id ORDER BY u.created_at DESC
    `;

        const result = await client.query(query);
        console.log(`Total Rows: ${result.rows.length}`);

        const parents = result.rows.filter(r => r.role === 'parent');
        console.log(`Parents Found: ${parents.length}`);
        parents.forEach(p => console.log(` - ${p.email} (${p.id})`));

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

debugQuery();
