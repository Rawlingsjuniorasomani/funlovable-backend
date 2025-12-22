const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('./db/pool');
const jwt = require('jsonwebtoken');

async function checkCurrentUser() {
    try {
        
        const users = await pool.query(`
            SELECT u.id, u.email, u.role, u.is_approved,
                   COALESCE(bool_or(ur.role = 'super_admin'), false) as is_super_admin
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
        `);

        console.log('\n=== All Users in Database ===');
        users.rows.forEach(u => {
            console.log(`Email: ${u.email}`);
            console.log(`  Role: ${u.role}`);
            console.log(`  Approved: ${u.is_approved}`);
            console.log(`  Super Admin: ${u.is_super_admin}`);
            console.log('---');
        });

        
        const teacherSubjects = await pool.query(`
            SELECT ts.teacher_id, u.email, ts.subject_id, s.name as subject_name
            FROM teacher_subjects ts
            JOIN users u ON ts.teacher_id = u.id
            JOIN subjects s ON ts.subject_id = s.id
        `);

        console.log('\n=== Teacher-Subject Assignments ===');
        if (teacherSubjects.rows.length === 0) {
            console.log('No teacher-subject assignments found!');
        } else {
            teacherSubjects.rows.forEach(ts => {
                console.log(`Teacher: ${ts.email} -> Subject: ${ts.subject_name}`);
            });
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        process.exit();
    }
}

checkCurrentUser();
