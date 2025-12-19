require('dotenv').config();
const pool = require('../src/db/pool');

async function testSubscriptionsEndpoint() {
    try {
        // Get a parent user
        const parentRes = await pool.query("SELECT id FROM users WHERE role = 'parent' LIMIT 1");
        if (parentRes.rows.length === 0) {
            console.log('No parent found');
            return;
        }

        const parentId = parentRes.rows[0].id;
        console.log('Testing with parent ID:', parentId);

        // Test the exact query from subscriptions.js
        const subRes = await pool.query(`
      SELECT s.*, p.plan_name, p.price, p.duration_days, p.features
      FROM subscriptions s
      LEFT JOIN plans p ON s.plan = p.id
      WHERE s.user_id = $1
      ORDER BY s.created_at DESC
      LIMIT 1
    `, [parentId]);

        console.log('Subscription query result:', subRes.rows);

        // Test children count
        const countRes = await pool.query(
            'SELECT COUNT(*)::int as count FROM parent_children WHERE parent_id = $1',
            [parentId]
        );
        console.log('Children count:', countRes.rows[0]);

    } catch (err) {
        console.error('Error testing subscriptions:', err);
    } finally {
        pool.end();
    }
}

testSubscriptionsEndpoint();
