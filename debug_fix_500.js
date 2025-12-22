const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./src/db/pool');
const { v4: uuidv4 } = require('uuid');

async function debugCreateTeacher() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Create a dummy user first (Constraint: teachers.user_id references users.id)
        const userEmail = `debug_teacher_${Date.now()}@test.com`;
        const userRes = await client.query(`
            INSERT INTO users (name, email, password_hash, role, is_approved)
            VALUES ('Debug Teacher', $1, 'hash', 'teacher', true)
            RETURNING id
        `, [userEmail]);
        const userId = userRes.rows[0].id;
        console.log('Created debug user:', userId);

        // 2. Try inserting teacher
        console.log('Inserting teacher...');
        const teacherRes = await client.query(
            `INSERT INTO teachers (user_id, bio, qualifications, school, years_of_experience, address) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [userId, 'Bio', 'Quals', 'Debug School', 5, '123 Debug St']
        );
        console.log('Teacher insert result rows:', teacherRes.rows.length);
        if (teacherRes.rows.length > 0) {
            console.log('Teacher ID:', teacherRes.rows[0].id);
        } else {
            console.error('No rows returned from Teacher Insert!');
        }

        const teacherId = teacherRes.rows[0].id; // Potential crash point?

        // 3. Try inserting subject (Need a valid subject ID)
        // Check if any subject exists
        const subRes = await client.query('SELECT id FROM subjects LIMIT 1');
        if (subRes.rows.length > 0) {
            const subjectId = subRes.rows[0].id;
            console.log('Found subject:', subjectId);

            console.log('Inserting teacher_subject...');
            await client.query(
                `INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)`,
                [teacherId, subjectId]
            );
            console.log('Teacher subject linked successfully.');
        } else {
            console.log('No subjects found to test linking.');
        }

        await client.query('ROLLBACK'); // Always rollback to clean up
        console.log('Test completed successfully (Rolled back).');

    } catch (error) {
        console.error('DEBUG SCRIPT CRASHED:', error);
        await client.query('ROLLBACK');
    } finally {
        client.release();
        pool.end();
    }
}

debugCreateTeacher();
