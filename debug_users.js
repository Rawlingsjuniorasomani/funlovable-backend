const pool = require('./src/db/pool');

async function checkUsers() {
    try {
        const res = await pool.query("SELECT id, name, email, role, is_onboarded FROM users WHERE role = 'parent'");
        console.log('Parents:', res.rows);

        const parentId = '44e48d12-9212-4209-98df-0ebd447a11ac';
        const children = await pool.query('SELECT * FROM parent_children WHERE parent_id = $1', [parentId]);
        console.log('Children for first parent:', children.rows);

        const sub = await pool.query("SELECT * FROM subscriptions WHERE user_id = $1", [parentId]);
        console.log('Subscription for first parent:', sub.rows);
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

checkUsers();
