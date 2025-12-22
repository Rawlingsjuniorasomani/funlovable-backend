const axios = require('axios');

async function testApi() {
    try {
        
        console.log('Logging in...');
        const loginRes = await axios.post('http://localhost:5000/api/auth/admin/login', {
            email: 'admin@edulearn.com',
            password: 'admin123'
        });
        const token = loginRes.data.token;
        console.log('✅ Logged in. Token:', token.substring(0, 20) + '...');

        
        const userId = '0dabe83a-43f9-4118-aaff-3c72dacb5e7a';
        console.log(`\nRequesting /api/users/${userId}...`);

        const userRes = await axios.get(`http://localhost:5000/api/users/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Success! User data:', userRes.data);

    } catch (err) {
        if (err.response) {
            console.error(`❌ Request failed with status ${err.response.status}`);
            console.error('Response data:', err.response.data);
        } else {
            console.error('❌ Network/Client error:', err.message);
        }
    }
}

testApi();
