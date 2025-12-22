require('dotenv').config();
const pool = require('./db/pool');
const bcrypt = require('bcryptjs');
const API_URL = 'http://localhost:5000/api';

async function testSuperAdmin() {
    try {
        console.log("1. Creating a temporary Primary Admin...");
        const adminEmail = `primary_admin_${Date.now()}@test.com`;
        const pwHash = await bcrypt.hash('password', 10);

        const adminRes = await pool.query(`
            INSERT INTO users (name, email, password_hash, role, is_approved, is_onboarded)
            VALUES ('Primary Admin', $1, $2, 'admin', true, true)
            RETURNING id
        `, [adminEmail, pwHash]);
        const adminId = adminRes.rows[0].id;

        
        const loginRes = await fetch(`${API_URL}/auth/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: adminEmail, password: 'password' })
        });
        const loginData = await loginRes.json();

        if (!loginData.token) {
            throw new Error('Login failed: ' + JSON.stringify(loginData));
        }
        const token = loginData.token;
        console.log("✅ Primary Admin Logged In");

        
        console.log("2. Inviting Secondary Admin...");
        const newAdminEmail = `new_admin_${Date.now()}@test.com`;
        const inviteRes = await fetch(`${API_URL}/users/admins/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                name: 'Secondary Admin',
                email: newAdminEmail,
                password: 'password123',
                phone: '1234567890'
            })
        });
        const invitedAdmin = await inviteRes.json();
        console.log("Invited Admin ID:", invitedAdmin.id);

        
        console.log("3. Promoting to Super Admin...");
        const promoteRes = await fetch(`${API_URL}/users/${invitedAdmin.id}/promote`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        console.log("Promote response:", await promoteRes.json());

        
        console.log("4. Verifying Admin List...");
        const listRes = await fetch(`${API_URL}/users/admins/list`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const list = await listRes.json();

        const target = list.find(u => u.id === invitedAdmin.id);
        console.log("Target Admin in List:", target);

        if (target && target.is_super_admin) {
            console.log("✅ SUCCESS: User is Super Admin");
        } else {
            console.error("❌ FAILURE: User is NOT Super Admin");
        }

        
        await pool.query('DELETE FROM users WHERE id = $1 OR id = $2', [adminId, invitedAdmin.id]);
        await pool.query('DELETE FROM user_roles WHERE user_id = $1', [invitedAdmin.id]);

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

testSuperAdmin();
