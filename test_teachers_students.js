require('dotenv').config();
const pool = require('./src/db/pool');

async function test() {
    const client = await pool.connect();
    try {
        console.log("Fetching teacher...");
        const teacherRes = await client.query("SELECT id FROM users WHERE role = 'teacher' LIMIT 1");
        if (teacherRes.rows.length === 0) throw new Error("No teacher found");
        const teacherId = teacherRes.rows[0].id;
        console.log("Teacher ID:", teacherId);

        const query = `
            SELECT DISTINCT
                u.id, 
                u.name, 
                u.email, 
                u.avatar, 
                u.school, 
                u.student_class,
                u.is_approved,
                u.created_at,
                (SELECT AVG(percentage) FROM quiz_attempts qa WHERE qa.user_id::text = u.id::text) as avg_score,
                (SELECT COUNT(*) FROM user_progress up WHERE up.user_id::text = u.id::text AND up.is_completed = true) as completed_lessons,
                STRING_AGG(DISTINCT s.name, ', ') as enrolled_subjects
            FROM users u
            JOIN student_subjects ss ON u.id = ss.student_id
            JOIN subjects s ON ss.subject_id = s.id
            JOIN teacher_subjects ts ON s.id = ts.subject_id
            WHERE ts.teacher_id::text = $1::text AND u.role = 'student'
            GROUP BY u.id
            ORDER BY u.name ASC;
        `;

        console.log("Running query...");
        const result = await client.query(query, [teacherId]);
        console.log("Rows fetched:", result.rows.length);

        const students = result.rows.map(std => ({
            ...std,
            avg_score: std.avg_score ? parseFloat(std.avg_score) : 0,
            completed_lessons: parseInt(std.completed_lessons) || 0
        }));
        console.log("Mapped students:", students.length);

    } catch (err) {
        console.error("Test failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}
test();
