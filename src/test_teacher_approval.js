require('dotenv').config();
const AuthService = require('./services/AuthService');
const pool = require('./db/pool');
const bcrypt = require('bcryptjs');

async function testTeacherApproval() {
    const email = `test_teacher_${Date.now()}@test.com`;
    const password = 'password123';

    try {
        console.log('1. Registering new teacher...');
        const regResult = await AuthService.register({
            name: 'Test Teacher',
            email,
            password,
            role: 'teacher',
            school: 'Test School',
            yearsOfExperience: 5,
            address: '123 Main St',
            subjectId: null 
        });

        console.log('Registration result:', regResult.requiresApproval ? 'Pending Approval (Correct)' : 'Auto-Approved (Incorrect)');

        console.log('2. Attempting login before approval...');
        try {
            await AuthService.login(email, password);
            console.error('❌ Login succeeded but should have failed!');
        } catch (e) {
            console.log('✅ Login failed as expected:', e.message);
        }

        console.log('3. Manually approving teacher...');
        await pool.query("UPDATE users SET is_approved = true WHERE email = $1", [email]);

        console.log('4. Attempting login after approval...');
        const loginResult = await AuthService.login(email, password);
        console.log('✅ Login successful:', loginResult.token ? 'Token generated' : 'No token');

        
        await pool.query("DELETE FROM users WHERE email = $1", [email]);

        process.exit(0);
    } catch (e) {
        console.error('Unexpected error:', e);
        process.exit(1);
    }
}

testTeacherApproval();
