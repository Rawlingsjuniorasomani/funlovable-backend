
async function testRegistration() {
    const randomId = Math.floor(Math.random() * 10000);
    const user = {
        name: `Test User ${randomId}`,
        email: `testuser${randomId}@example.com`,
        password: 'password123',
        role: 'student',
        class: 'Grade 10',
        age: 15,
        school: 'Test School',
        phone: '1234567890'
    };

    console.log('Attempting registration with:', user);

    
    const url = 'http://127.0.0.1:5000/api/auth/register';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });

        const status = response.status;
        const data = await response.json();

        console.log(`Status: ${status}`);
        console.log('Response:', JSON.stringify(data, null, 2));

        if (status === 201) {
            console.log('✅ Registration SUCCESS');
        } else {
            console.log('❌ Registration FAILED');
        }

    } catch (error) {
        console.error('❌ Request Failed:', error.message);
        if (error.cause) console.error('Cause:', error.cause);
    }
}

testRegistration();
