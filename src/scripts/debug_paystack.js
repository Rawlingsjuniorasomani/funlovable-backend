const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const axios = require('axios');

async function testPaystack() {
    console.log('Testing Paystack Initialization...');
    console.log('Secret Key (first 5 chars):', process.env.PAYSTACK_SECRET_KEY?.substring(0, 5));

    
    const payload = {
        email: 'test_user@example.com',
        amount: 5000, 
        currency: 'GHS', 
        callback_url: 'http://localhost:8080/payment/verify',
        metadata: {
            custom_field: 'debug_test'
        }
    };

    try {
        const response = await axios.post(
            'https://api.paystack.co/transaction/initialize',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('SUCCESS!');
        console.log('Data:', response.data);
    } catch (error) {
        console.error('FAILED!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testPaystack();
