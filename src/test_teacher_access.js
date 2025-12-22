const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('./db/pool');

async function testTeacherAccess() {
    try {
        
        const userResult = await pool.query(`
            SELECT u.id, u.email, u.role, u.is_approved
            FROM users u
            WHERE u.email = 'asomanirawlingsjunior5333@gmail.com'
        `);

        if (userResult.rows.length === 0) {
            console.log('❌ User not found!');
            return;
        }

        const user = userResult.rows[0];
        console.log('\n=== User Info ===');
        console.log('Email:', user.email);
        console.log('Role:', user.role);
        console.log('Approved:', user.is_approved);
        console.log('User ID:', user.id);

        
        const rolesResult = await pool.query(
            'SELECT role FROM user_roles WHERE user_id = $1',
            [user.id]
        );

        console.log('\n=== Roles from user_roles table ===');
        if (rolesResult.rows.length === 0) {
            console.log('No additional roles in user_roles table');
        } else {
            rolesResult.rows.forEach(r => console.log('-', r.role));
        }

        
        const userRoles = rolesResult.rows.map(r => r.role);
        userRoles.push(user.role); 

        const requiredRoles = ['teacher'];
        const hasRole = requiredRoles.some(role => userRoles.includes(role));

        console.log('\n=== Permission Check ===');
        console.log('User Roles:', userRoles);
        console.log('Required Roles:', requiredRoles);
        console.log('Has Permission:', hasRole ? '✅ YES' : '❌ NO');

        
        const subjectsResult = await pool.query(`
            SELECT s.id, s.name
            FROM subjects s
            JOIN teacher_subjects ts ON s.id = ts.subject_id
            WHERE ts.teacher_id = $1
        `, [user.id]);

        console.log('\n=== Teacher Subjects ===');
        if (subjectsResult.rows.length === 0) {
            console.log('No subjects assigned');
        } else {
            subjectsResult.rows.forEach(s => console.log('-', s.name, `(ID: ${s.id})`));
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

testTeacherAccess();
