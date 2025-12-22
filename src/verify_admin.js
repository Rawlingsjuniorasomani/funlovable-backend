require('dotenv').config();
const axios = require('axios');
const pool = require('./db/pool');

async function verifyAdmin() {
    try {
        console.log('🔍 Verifying Admin Dashboard Connection...');

        
        const loginRes = await axios.post('http://localhost:5000/api/auth/admin/login', {
            email: 'admin@edulearn.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('✅ Admin Login Successful');

        
        const usersRes = await axios.get('http://localhost:5000/api/users', {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (usersRes.status === 200 && Array.isArray(usersRes.data)) {
            console.log(`✅ Admin Dashboard Connected! Fetched ${usersRes.data.length} users.`);
            const hasTeacher = usersRes.data.some(u => u.email === 'teacher@edulearn.com');
            if (!hasTeacher) {
                console.log('✅ Teacher is correctly missing from the list.');
            } else {
                console.log('❌ Warning: Teacher still appears in the list?');
            }
        } else {
            console.log('❌ Failed to fetch users for Admin Dashboard.');
        }

    } catch (err) {
        console.error('❌ Admin Verification Failed:', err.message);
        if (err.response) {
            console.error('   Details:', err.response.data);
        }
    } finally {
        pool.end();
    }
}

verifyAdmin();
