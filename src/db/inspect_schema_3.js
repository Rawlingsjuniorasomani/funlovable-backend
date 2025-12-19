const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const pool = require('../db/pool');

async function inspect() {
    try {
        const tables = ['users', 'user_roles', 'plans', 'payments', 'subscriptions', 'parent_children', 'teacher_subjects', 'user_xp', 'live_classes'];

        for (const table of tables) {
            const res = await pool.query(
                `SELECT column_name, data_type
                 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = $1
                 ORDER BY ordinal_position`,
                [table]
            );
            console.log(`\n--- ${table} schema ---`);
            console.table(res.rows);
        }

        pool.end();
    } catch (e) {
        console.error(e);
    }
}
inspect();
