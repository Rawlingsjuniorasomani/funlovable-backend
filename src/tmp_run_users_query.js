const pool = require('./db/pool');

const query = `
      SELECT u.id, u.name, u.email, u.role, u.phone, u.avatar, u.is_approved, u.is_onboarded, u.created_at,
             u.student_class, u.school,
             MAX(COALESCE(ux.total_xp, 0)) as total_xp, MAX(COALESCE(ux.level, 1)) as level,
             (SELECT COUNT(*) FROM parent_children pc WHERE pc.parent_id::text = u.id)::int as children_count,
             (
               SELECT s.status
               FROM subscriptions s 
               WHERE s.user_id::text = u.id
               ORDER BY s.created_at DESC 
               LIMIT 1
             ) as subscription_status,
             (
               SELECT s.expires_at
               FROM subscriptions s 
               WHERE s.user_id::text = u.id
               ORDER BY s.created_at DESC 
               LIMIT 1
             ) as subscription_end_date,
             (
               SELECT s.plan
               FROM subscriptions s 
               WHERE s.user_id::text = u.id
               ORDER BY s.created_at DESC 
               LIMIT 1
             ) as plan_name,
             (
               SELECT u2.name 
               FROM parent_children pc2 
               JOIN users u2 ON pc2.parent_id::text = u2.id 
               WHERE pc2.child_id::text = u.id
               LIMIT 1
             ) as parent_name,
             STRING_AGG(DISTINCT s.name, ', ') as subjects_list
      FROM users u
      LEFT JOIN teacher_subjects ts ON u.id::text = ts.teacher_id::text
      LEFT JOIN subjects s ON ts.subject_id = s.id
      LEFT JOIN user_xp ux ON u.id::text = ux.user_id::text
      WHERE 1=1
    `;

(async () => {
  try {
    const res = await pool.query(query);
    console.log('Rows:', res.rows.length);
    console.log(res.rows.slice(0,3));
  } catch (err) {
    console.error('Query error:');
    console.error(err);
  } finally {
    process.exit(0);
  }
})();
