const axios = require('axios');
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function verifyStats() {
    let client;
    try {
        
        console.log('Logging in as admin...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'admin@edulearn.com',
            password: 'admin123'
        });

        const token = loginRes.data.token;
        console.log('Admin logged in. Token received.');

        
        console.log('Fetching admin stats...');
        const statsRes = await axios.get('http://localhost:5000/api/admin/stats', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Stats received:', statsRes.data);

        
        const stats = statsRes.data;
        const requiredKeys = ['totalUsers', 'totalTeachers', 'totalParents', 'totalStudents', 'totalSubjects', 'totalRevenue'];
        const missingKeys = requiredKeys.filter(k => !(k in stats));

        if (missingKeys.length > 0) {
            console.error('❌ Missing keys in stats response:', missingKeys);
        } else {
            console.log('✅ Stats response structure is correct.');
        }

        
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        console.log(`DB Check: Total Users in DB: ${usersCount.rows[0].count}`);

        if (parseInt(stats.totalUsers) === parseInt(usersCount.rows[0].count)) {
            console.log('✅ User count matches DB.');
        } else {
            console.warn(`⚠️ User count mismatch: API ${stats.totalUsers} vs DB ${usersCount.rows[0].count}`);
        }

    } catch (error) {
        if (error.response) {
            console.error('❌ Verification failed:', error.response.status, error.response.data);
        } else {
            console.error('❌ Verification failed:', error.message);
        }
    } finally {
        await pool.end();
    }
}

verifyStats();
