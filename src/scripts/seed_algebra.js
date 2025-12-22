const { Pool } = require('pg');
require('dotenv').config({ path: '../../.env' }); 

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seedAlgebra() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        console.log('Starting Algebra Seeding...');

        
        let subjectId;
        const subjectRes = await client.query("SELECT id FROM subjects WHERE name = $1", ['Mathematics (JHS / SHS)']);

        if (subjectRes.rows.length > 0) {
            subjectId = subjectRes.rows[0].id;
            console.log(`Found existing subject: ${subjectId}`);
        } else {
            const newSubject = await client.query(`
        INSERT INTO subjects (name, description, category, level, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, ['Mathematics (JHS / SHS)', 'Comprehensive Mathematics course for Junior and Senior High School', 'Science', 'JHS', 'published']);
            subjectId = newSubject.rows[0].id;
            console.log(`Created new subject: ${subjectId}`);
        }

        
        const moduleRes = await client.query(`
      INSERT INTO modules (subject_id, title, description, status, order_index)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
            subjectId,
            'Introduction to Algebra',
            'This module introduces students to the basic concepts of algebra, including variables, expressions, and simple equations.',
            'published',
            1
        ]);
        const moduleId = moduleRes.rows[0].id;
        console.log(`Created Module: ${moduleId}`);

        
        const lessons = [
            {
                title: 'What Is Algebra?',
                type: 'text',
                duration: 10,
                content: 'Definition of algebra. Importance of algebra in mathematics. Real-life examples of algebra usage.',
                order: 1
            },
            {
                title: 'Understanding Variables',
                type: 'video',
                duration: 15,
                content: 'Meaning of variables. Common symbols used (x, y, z). Examples of variables in expressions.',
                video_url: 'https://www.youtube.com/watch?v=NybHckSEQBI', 
                order: 2
            },
            {
                title: 'Algebraic Expressions',
                type: 'text',
                duration: 20,
                content: 'What is an algebraic expression. Terms, coefficients, constants. Sample expressions explained.',
                order: 3
            },
            {
                title: 'Simple Algebraic Equations',
                type: 'video',
                duration: 18,
                content: 'Difference between expressions and equations. Solving simple equations. Step-by-step examples.',
                video_url: 'https://www.youtube.com/watch?v=L2jq836zAMg', 
                order: 4
            },
            {
                title: 'Practice Examples',
                type: 'pdf',
                duration: 15,
                content: 'Practice questions. Worked solutions.',
                file_url: 'https://example.com/algebra-practice.pdf', 
                order: 5
            }
        ];

        for (const lesson of lessons) {
            await client.query(`
        INSERT INTO lessons (module_id, title, content, lesson_type, duration_minutes, status, order_index, video_url, file_url)
        VALUES ($1, $2, $3, $4, $5, 'published', $6, $7, $8)
      `, [moduleId, lesson.title, lesson.content, lesson.type, lesson.duration, lesson.order, lesson.video_url, lesson.file_url]);
        }
        console.log(`Created ${lessons.length} lessons`);

        
        
        const teacherRes = await client.query("SELECT id FROM users WHERE role = 'teacher' LIMIT 1");
        const teacherId = teacherRes.rows.length > 0 ? teacherRes.rows[0].id : null;

        const quizRes = await client.query(`
      INSERT INTO quizzes (
        module_id, subject_id, teacher_id, title, description,
        quiz_type, duration_minutes, total_marks, pass_percentage, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
            moduleId, subjectId, teacherId,
            'Algebra Basics Quiz',
            'Test your knowledge on algebra basics.',
            'standard', 15, 50, 60, 'published'
        ]);
        const quizId = quizRes.rows[0].id;
        console.log(`Created Quiz: ${quizId}`);

        
        const questions = [
            { text: 'What is a variable?', type: 'multiple_choice', opts: ['A number', 'A symbol representing a number', 'An operator', 'None of above'], ans: 'A symbol representing a number' },
            { text: 'Solve for x: x + 5 = 10', type: 'short_answer', ans: '5' },
            { text: 'Algebra is only about numbers.', type: 'true_false', ans: 'false' },
            { text: 'Which is a coefficient in 3x?', type: 'multiple_choice', opts: ['3', 'x', '3x', 'None'], ans: '3' },
            { text: 'Simplify: 2x + 3x', type: 'multiple_choice', opts: ['5x', '6x', '5x^2', '23x'], ans: '5x' }
        ];

        for (const q of questions) {
            await client.query(`
        INSERT INTO questions (quiz_id, question_text, question_type, options, correct_answer, points)
        VALUES ($1, $2, $3, $4, $5, 10)
      `, [quizId, q.text, q.type, q.opts ? JSON.stringify(q.opts) : null, q.ans]);
        }
        console.log('Added Questions to Quiz');

        
        await client.query(`
      INSERT INTO assignments (
        module_id, subject_id, teacher_id, title, description,
        total_marks, status, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW() + INTERVAL '7 days')
    `, [
            moduleId, subjectId, teacherId,
            'Solving Simple Algebra Problems',
            'Instructions: Solve the given algebraic equations. Show your steps clearly.',
            100, 'published'
        ]);
        console.log('Created Assignment');

        await client.query('COMMIT');
        console.log('Seeding Completed Successfully!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Seeding Failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

seedAlgebra();
