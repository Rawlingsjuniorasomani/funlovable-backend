require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');

async function testAdminLogin() {
    try {
        console.log('Testing admin login...');

        const email = 'admin@edulearn.com';
        const password = 'admin123';

        
        const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        console.log('User found:', userResult.rows.length > 0);

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            console.log('User details:', {
                id: user.id,
                email: user.email,
                role: user.role,
                is_approved: user.is_approved
            });

            
            const isValid = await bcrypt.compare(password, user.password_hash);
            console.log('Password valid:', isValid);

            
            const rolesResult = await pool.query('SELECT * FROM user_roles WHERE user_id = $1', [user.id]);
            console.log('User roles:', rolesResult.rows);
        }

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

testAdminLogin();
