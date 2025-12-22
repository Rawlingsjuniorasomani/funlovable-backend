const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./pool');

async function clearSeedData() {
    const client = await pool.connect();
    try {
        console.log('🧹 Cleaning up seed data...');
        await client.query('BEGIN');

        
        const teacherResult = await client.query("SELECT id FROM users WHERE email = 'teacher@edulearn.com'");
        const teacherId = teacherResult.rows[0]?.id;

        if (teacherId) {
            console.log(`Found teacher ID: ${teacherId}`);

            
            const subjectsResult = await client.query("SELECT id FROM subjects WHERE teacher_id = $1", [teacherId]);
            const subjectIds = subjectsResult.rows.map(row => row.id);

            if (subjectIds.length > 0) {
                console.log(`Found ${subjectIds.length} subjects to remove.`);

                

                
                const modulesResult = await client.query("SELECT id FROM modules WHERE subject_id = ANY($1)", [subjectIds]);
                const moduleIds = modulesResult.rows.map(row => row.id);

                if (moduleIds.length > 0) {
                    
                    await client.query("DELETE FROM lessons WHERE module_id = ANY($1)", [moduleIds]);

                    
                    
                    const quizzesResult = await client.query("DELETE FROM quizzes WHERE module_id = ANY($1) RETURNING id", [moduleIds]);
                    
                    
                    

                    
                    
                }

                
                await client.query("DELETE FROM modules WHERE subject_id = ANY($1)", [subjectIds]);

                
                await client.query("DELETE FROM subjects WHERE id = ANY($1)", [subjectIds]);
            }

            
            await client.query("DELETE FROM user_roles WHERE user_id = $1", [teacherId]);
            await client.query("DELETE FROM users WHERE id = $1", [teacherId]);
            console.log('✅ Deleted Teacher and related content.');
        } else {
            console.log('ℹ️ Teacher not found (already deleted?).');
        }

        
        const adminResult = await client.query("SELECT id FROM users WHERE email = 'admin@edulearn.com'");
        const adminId = adminResult.rows[0]?.id;

        if (adminId) {
            await client.query("DELETE FROM user_roles WHERE user_id = $1", [adminId]);
            await client.query("DELETE FROM users WHERE id = $1", [adminId]);
            console.log('✅ Deleted Admin user.');
        } else {
            console.log('ℹ️ Admin not found.');
        }

        
        const achievementNames = ['First Steps', 'Quiz Master', 'Dedicated Learner', 'Perfect Week'];
        await client.query("DELETE FROM achievements WHERE name = ANY($1)", [achievementNames]);
        console.log('✅ Deleted sample achievements.');

        await client.query('COMMIT');
        console.log('✨ Seed data cleanup complete!');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error clearing seed data:', error);
        
        if (error.code === '23503') {
            console.error('💡 Hint: Constraint violation. Some data is still linked.');
        }
    } finally {
        client.release();
        process.exit();
    }
}

clearSeedData();
