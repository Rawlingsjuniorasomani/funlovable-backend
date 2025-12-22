require('dotenv').config();
const pool = require('./db/pool');

async function cleanSubjects() {
    try {
        console.log('🔍 Inspecting teacher_subjects...');

        const res = await pool.query(`
            SELECT ts.teacher_id, u.name as teacher_name, ts.subject_id, s.name as subject_name
            FROM teacher_subjects ts
            JOIN users u ON ts.teacher_id = u.id
            JOIN subjects s ON ts.subject_id = s.id
        `);

        console.log('--- Teacher Subjects (Join) ---');
        console.table(res.rows);

        const subjectsRes = await pool.query(`SELECT id, name, teacher_id FROM subjects WHERE teacher_id IS NOT NULL`);
        console.log('--- Subjects with Teachers ---');
        console.table(subjectsRes.rows);

        const usersRes = await pool.query(`SELECT id, name, email, role FROM users WHERE role = 'admin'`);

        console.log('--- Admin Users ---');
        console.table(usersRes.rows);

        const schemaRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users';
        `);
        console.log('--- Users Table Schema ---');
        console.table(schemaRes.rows);



        
        
        

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

cleanSubjects();
