require('dotenv').config();
const AssignmentModel = require('./src/models/AssignmentModel');
const pool = require('./src/db/pool');

async function test() {
    try {
        // Reuse teacher/subject
        const userRes = await pool.query("SELECT id FROM users WHERE role = 'teacher' LIMIT 1");
        const teacherId = userRes.rows[0].id;
        const subRes = await pool.query("SELECT id FROM subjects LIMIT 1");
        const subjectId = subRes.rows[0].id;

        // Create assignment (or use existing)
        const assignment = await AssignmentModel.create({
            teacher_id: teacherId,
            subject_id: subjectId,
            title: "Test Submission",
            description: "Test",
            submitted_type: 'text',
            max_score: 100, // Decimal now allowed
            due_date: new Date()
        });
        console.log("Created assignment:", assignment.id);

        // Get a student
        let studentRes = await pool.query("SELECT id FROM users WHERE role = 'student' LIMIT 1");
        let studentId;
        if (studentRes.rows.length === 0) {
            // create dummy student
            const s = await pool.query("INSERT INTO users (name, email, password_hash, role) VALUES ('Test Student', 'teststudent@example.com', 'hash', 'student') RETURNING id");
            studentId = s.rows[0].id;
        } else {
            studentId = studentRes.rows[0].id;
        }

        // Submit
        await AssignmentModel.submit({
            assignment_id: assignment.id,
            student_id: studentId,
            content: "My submission",
            status: "submitted"
        });
        console.log("Submitted assignment.");

        // Get submissions (This caused 500)
        const subs = await AssignmentModel.getSubmissions(assignment.id);
        console.log("Retrieved submissions:", subs.length);
        console.log("Name:", subs[0].student_name);

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        pool.end();
    }
}
test();
