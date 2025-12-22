require('dotenv').config();
const pool = require('./src/db/pool');

async function inspect() {
    try {
        console.log("--- student_subjects ---");
        const res1 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'student_subjects'");
        console.table(res1.rows);

        console.log("--- teacher_subjects ---");
        const res2 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'teacher_subjects'");
        console.table(res2.rows);

        console.log("--- quiz_attempts ---");
        const res3 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'quiz_attempts'");
        console.table(res3.rows);

        console.log("--- user_progress ---");
        const res4 = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_progress'");
        console.table(res4.rows);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
inspect();
