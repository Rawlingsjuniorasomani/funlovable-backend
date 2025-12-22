require('dotenv').config();
const pool = require('./db/pool');

async function debugDelete() {
    try {
        console.log('🔍 Debugging DELETE constraints...');

        
        const res = await pool.query("SELECT id FROM users WHERE email = 'teacher@edulearn.com'");
        if (res.rows.length === 0) {
            console.log('Teacher not found. Create it first or use another.');
            process.exit(1);
        }
        const userId = res.rows[0].id;
        console.log(`Target User ID: ${userId}`);

        
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);

        console.log('✅ Unexpected: User deleted successfully (No constraints hit?)');
    } catch (err) {
        if (err.code === '23503') {
            console.log('❌ Foreign Key Violation Detected:');
            console.log(`   Table: ${err.table}`);
            console.log(`   Constraint: ${err.constraint}`);
            console.log(`   Detail: ${err.detail}`);
        } else {
            console.error('❌ Other Error:', err);
        }
    } finally {
        pool.end();
    }
}

debugDelete();
