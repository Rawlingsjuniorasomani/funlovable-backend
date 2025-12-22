require('dotenv').config();
const QuizModel = require('./src/models/QuizModel');
const pool = require('./src/db/pool');

async function test() {
    try {
        // Need a valid teacher_id, subject_id, module_id.
        // I'll pick the first user who is a teacher.
        const teacherRes = await pool.query("SELECT id FROM users WHERE role = 'teacher' LIMIT 1");
        if (teacherRes.rows.length === 0) {
            // fallback
            const userRes = await pool.query("SELECT id FROM users LIMIT 1");
            if (userRes.rows.length === 0) throw new Error("No users found");
            var teacherIds = userRes.rows[0].id;
        } else {
            var teacherIds = teacherRes.rows[0].id;
        }

        // Get a subject
        const subRes = await pool.query("SELECT id FROM subjects LIMIT 1");
        if (subRes.rows.length === 0) {
            console.log("No subjects, cannot test full FK");
            return;
        }
        const subjectId = subRes.rows[0].id;

        // Get a module
        const modRes = await pool.query("SELECT id FROM modules LIMIT 1");
        const moduleId = modRes.rows.length > 0 ? modRes.rows[0].id : null;

        console.log("Testing creation with:", { teacherIds, subjectId, moduleId });

        const result = await QuizModel.create({
            teacher_id: teacherIds,
            subject_id: subjectId,
            module_id: moduleId, // can be null in DB? Schema check needed.
            title: "Test Quiz",
            pass_mark: 70
        });
        console.log("Creation success:", result.id);

    } catch (error) {
        console.error("Creation failed:", error);
    } finally {
        pool.end();
    }
}
test();
