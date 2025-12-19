const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const axios = require('axios');

async function testKey() {
    const key = process.env.PAYSTACK_SECRET_KEY;
    if (!key) {
        console.error('❌ PAYSTACK_SECRET_KEY is missing in .env');
        return;
    }

    // Show partial key for verification context (safe to show first 4-8 chars)
    const maskedKey = key.length > 8 ? `${key.substring(0, 8)}...` : '***';
    console.log(`🔑 Testing key: ${maskedKey}`);

    try {
        // We use 'bank' endpoint or 'balance' or even 'transaction/verify' with a dummy ref if we just want to check auth.
        // 'balance' is a good candidate for secret key check.
        const response = await axios.get('https://api.paystack.co/balance', {
            headers: { Authorization: `Bearer ${key}` }
        });

        console.log('✅ Key is VALID!');
        console.log('Balance:', response.data.data);
    } catch (error) {
        console.error('❌ Key is INVALID or request failed.');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Message:', error.response.data.message);
            console.error('Code:', error.response.data.code);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testKey();
