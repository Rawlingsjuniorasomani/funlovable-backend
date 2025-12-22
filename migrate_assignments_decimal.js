require('dotenv').config();
const pool = require('./src/db/pool');

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Migrating assignment tables to DECIMAL...');

        // assignment_questions.marks
        await client.query(`
            ALTER TABLE assignment_questions 
            ALTER COLUMN marks TYPE DECIMAL(10, 2)
        `);
        console.log('assignment_questions.marks updated.');

        // assignments.max_score and total_marks
        await client.query(`
            ALTER TABLE assignments 
            ALTER COLUMN max_score TYPE DECIMAL(10, 2),
            ALTER COLUMN total_marks TYPE DECIMAL(10, 2)
        `);
        console.log('assignments scores updated.');

        // student_assignments.score
        await client.query(`
            ALTER TABLE student_assignments 
            ALTER COLUMN score TYPE DECIMAL(10, 2)
        `);
        console.log('student_assignments.score updated.');

        // student_assignment_answers.marks_awarded
        await client.query(`
            ALTER TABLE student_assignment_answers 
            ALTER COLUMN marks_awarded TYPE DECIMAL(10, 2)
        `);
        console.log('student_assignment_answers.marks_awarded updated.');

        await client.query('COMMIT');
        console.log('Migration successful.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', error);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
