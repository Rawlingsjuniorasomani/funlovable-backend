require('dotenv').config();
const pool = require('./src/db/pool');

async function fixExpiry() {
    try {
        // Find most recent subscription
        const res = await pool.query(`
            SELECT * FROM subscriptions 
            ORDER BY created_at DESC 
            LIMIT 1
        `);

        if (res.rows.length === 0) {
            console.log('No subscriptions found.');
            return;
        }

        const sub = res.rows[0];
        console.log('Found recent subscription:', sub.id, 'User:', sub.user_id);
        console.log('Current Expiry:', sub.expires_at);

        // Calculate new expiry (Start Date + 30 days)
        const startDate = new Date(sub.start_date || sub.created_at);
        const newExpiry = new Date(startDate);
        newExpiry.setDate(startDate.getDate() + 30);

        console.log('New Expiry:', newExpiry);

        // Update Subscription
        await pool.query(`
            UPDATE subscriptions 
            SET expires_at = $1 
            WHERE id = $2
        `, [newExpiry, sub.id]);

        // Update User
        await pool.query(`
            UPDATE users 
            SET subscription_end_date = $1 
            WHERE id = $2
        `, [newExpiry, sub.user_id]);

        console.log('Successfully updated expiry to 30 days.');

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

fixExpiry();
