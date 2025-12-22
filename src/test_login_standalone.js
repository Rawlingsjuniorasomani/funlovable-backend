require('dotenv').config();
const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function testLogin() {
    console.log('--- Testing Admin Login Standalone ---');
    const email = 'admin@edulearn.com';
    const password = 'admin';

    try {
        const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (res.rows.length === 0) {
            console.log('❌ User not found');
            return;
        }

        const user = res.rows[0];
        console.log('✅ User found:', user.email, 'Role:', user.role);
        console.log('   Hash:', user.password_hash);

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (isValid) {
            console.log('✅ Password matches!');
        } else {
            console.log('❌ Password DOES NOT match.');
            
            const newHash = await bcrypt.hash(password, 10);
            console.log('   New hash for comparison:', newHash);
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

testLogin();
