require('dotenv').config();
const pool = require('../src/db/pool');

async function testParentAnalytics() {
    try {
        const parentRes = await pool.query("SELECT id FROM users WHERE role = 'parent' LIMIT 1");
        if (parentRes.rows.length === 0) {
            console.log('No parent found');
            return;
        }

        const parentId = parentRes.rows[0].id;
        console.log('Testing with parent ID:', parentId);

        // Test the children query
        console.log('\n1. Testing children query...');
        const childrenResult = await pool.query(`
      SELECT u.id, u.name, u.avatar, u.student_class as grade
      FROM users u
      INNER JOIN parent_children pc ON u.id = pc.child_id
      WHERE pc.parent_id = $1
    `, [parentId]);
        console.log('Children found:', childrenResult.rows.length);
        const childIds = childrenResult.rows.map(c => c.id);

        if (childIds.length === 0) {
            console.log('No children found, analytics will return empty data');
            return;
        }

        // Test investment query
        console.log('\n2. Testing investment query...');
        try {
            const investmentResult = await pool.query(`
        SELECT COALESCE(SUM(amount), 0) as total
        FROM payments
        WHERE user_id = $1 AND status = 'success' OR status = 'completed'
      `, [parentId]);
            console.log('Investment result:', investmentResult.rows[0]);
        } catch (e) {
            console.error('Investment query FAILED:', e.message);
        }

        // Test weekly activity query
        console.log('\n3. Testing weekly activity query...');
        try {
            const weeklyActivityResult = await pool.query(`
        SELECT 
          to_char(d.day, 'Dy') as day,
          u.name as child_name,
          COALESCE(SUM(up.time_spent_minutes), 0) as minutes
        FROM (
          SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as day
        ) d
        CROSS JOIN unnest($1::uuid[]) as child_id
        JOIN users u ON u.id = child_id
        LEFT JOIN user_progress up ON DATE(up.completed_at) = d.day AND up.user_id = child_id
        GROUP BY d.day, u.name
        ORDER BY d.day
      `, [childIds]);
            console.log('Weekly activity rows:', weeklyActivityResult.rows.length);
        } catch (e) {
            console.error('Weekly activity query FAILED:', e.message);
        }

        // Test monthly payments query
        console.log('\n4. Testing monthly payments query...');
        try {
            const monthlyPaymentResult = await pool.query(`
        SELECT 
          to_char(d.month, 'Mon') as month_label,
          COALESCE(SUM(p.amount), 0) as amount
        FROM (
          SELECT generate_series(DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months', DATE_TRUNC('month', CURRENT_DATE), '1 month')::date as month
        ) d
        LEFT JOIN payments p ON DATE_TRUNC('month', p.created_at) = d.month AND p.user_id = $1 AND (p.status = 'success' OR p.status = 'completed')
        GROUP BY d.month
        ORDER BY d.month
      `, [parentId]);
            console.log('Monthly payments rows:', monthlyPaymentResult.rows.length);
        } catch (e) {
            console.error('Monthly payments query FAILED:', e.message);
        }

    } catch (err) {
        console.error('Error testing parent analytics:', err);
    } finally {
        pool.end();
    }
}

testParentAnalytics();
