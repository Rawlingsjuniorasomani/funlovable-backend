require('dotenv').config();
const AssignmentModel = require('./src/models/AssignmentModel');
const pool = require('./src/db/pool');

async function test() {
    try {
        const userRes = await pool.query("SELECT id FROM users WHERE role = 'teacher' LIMIT 1");
        if (userRes.rows.length === 0) throw new Error("No teacher");
        const teacherId = userRes.rows[0].id;

        const subRes = await pool.query("SELECT id FROM subjects LIMIT 1");
        const subjectId = subRes.rows[0].id;

        // Create dummy assignment
        const assignment = await AssignmentModel.create({
            teacher_id: teacherId,
            subject_id: subjectId,
            title: "Test Assignment",
            description: "Test",
            submitted_type: 'text',
            max_score: 100,
            due_date: new Date()
        });
        console.log("Created assignment:", assignment.id);

        // Add question
        const q = await AssignmentModel.addQuestion({
            assignment_id: assignment.id,
            question_text: "What is 2.5 + 2.5?",
            question_type: "mcq",
            marks: 5.5, // Test decimal
            order_index: 0,
            required: undefined,
            media_url: undefined,
            options: JSON.stringify(["1", "2", "3", "5"]),
            correct_answer: "5"
        });
        console.log("Question added:", q.id);

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        pool.end();
    }
}
test();
