require('dotenv').config();
const pool = require('./pool');
const bcrypt = require('bcryptjs');

async function createAdmin() {
    try {
        console.log('🔧 Creating/Updating admin user...');

        const email = 'admin@edulearn.com';
        const password = 'admin123';
        const passwordHash = await bcrypt.hash(password, 10);

        
        await pool.query('DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email = $1)', [email]);
        await pool.query('DELETE FROM users WHERE email = $1', [email]);

        
        const result = await pool.query(`
      INSERT INTO users (name, email, password_hash, role, is_approved, is_onboarded)
      VALUES ($1, $2, $3, $4, true, true)
      RETURNING id
    `, ['Admin User', email, passwordHash, 'admin']);

        const adminId = result.rows[0].id;

        
        await pool.query(`
      INSERT INTO user_roles (user_id, role)
      VALUES ($1, 'admin')
    `, [adminId]);

        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('🆔 User ID:', adminId);

        
        const verify = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        console.log('✓ Verified in database');

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

createAdmin();
