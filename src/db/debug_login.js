require('dotenv').config();
const pool = require('./pool');

async function debug() {
    const client = await pool.connect();
    try {
        console.log("--- Parents Debug Info ---");
        const parents = await client.query(`SELECT id, name, email FROM users WHERE role = 'parent'`);

        for (const p of parents.rows) {
            console.log(`\nParent: ${p.email} (${p.id})`);

            
            const children = await client.query('SELECT count(*) FROM parent_children WHERE parent_id = $1', [p.id]);
            console.log(`  - Children Count: ${children.rows[0].count}`);

            
            const sub = await client.query("SELECT * FROM subscriptions WHERE user_id = $1", [p.id]);
            if (sub.rows.length === 0) {
                console.log(`  - Subscription: NONE`);
            } else {
                const s = sub.rows[0];
                console.log(`  - Subscription: ${s.status} (Expires: ${s.expires_at})`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        pool.end();
    }
}

debug();
