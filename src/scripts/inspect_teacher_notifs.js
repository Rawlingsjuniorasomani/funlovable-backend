require('dotenv').config();
const pool = require('../db/pool');

async function inspect() {
    try {
        console.log('--- Teacher User Info ---');
        
        const user = await pool.query("SELECT id, name, email FROM users WHERE role = 'teacher' LIMIT 1");
        console.log('Teacher:', user.rows[0]);

        console.log('--- Notifications for this Teacher ---');
        if (user.rows.length > 0) {
            const notifs = await pool.query("SELECT id, title, is_read FROM notifications WHERE user_id = $1", [user.rows[0].id]);
            console.log('Notifications:', notifs.rows);
        } else {
            console.log('No teacher found');
        }
        process.exit(0);
    } catch (error) {
        console.error('Inspection Failed:', error);
        process.exit(1);
    }
}

inspect();
