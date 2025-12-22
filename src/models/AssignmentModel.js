const pool = require('../db/pool');

class AssignmentModel {
    static async create({ subject_id, teacher_id, title, description, due_date, max_score, resources, submission_type, status = 'active' }) {
        const result = await pool.query(
            `INSERT INTO assignments (
                subject_id, teacher_id, title, description, due_date, 
                max_score, total_marks, resources, submission_type, status, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
            RETURNING *`,
            [subject_id, teacher_id, title, description, due_date, max_score, max_score, resources, submission_type, status]
        );
        return result.rows[0];
    }

    static async update(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${paramIndex++}`);
                values.push(data[key]);
            }
        });

        values.push(id);
        const result = await pool.query(`
            UPDATE assignments SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        return result.rows[0];
    }

    static async findAllBySubject(subjectId) {
        const result = await pool.query(
            'SELECT * FROM assignments WHERE subject_id = $1 ORDER BY due_date DESC',
            [subjectId]
        );
        return result.rows;
    }

    static async findAllByTeacher(teacherId) {
        const result = await pool.query(
            'SELECT * FROM assignments WHERE teacher_id = $1 ORDER BY due_date DESC',
            [teacherId]
        );
        return result.rows;
    }

    static async findAllByStudent(studentId) {


        const result = await pool.query(
            `SELECT a.*, sa.status as submission_status, sa.submitted_at, sa.score
             FROM assignments a
             LEFT JOIN student_assignments sa ON a.id = sa.assignment_id AND sa.student_id = $1
             ORDER BY a.due_date DESC`,
            [studentId]
        );
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM assignments WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async findByStudentAndAssignment(studentId, assignmentId) {
        const result = await pool.query(
            'SELECT * FROM student_assignments WHERE student_id = $1 AND assignment_id = $2',
            [studentId, assignmentId]
        );
        return result.rows[0];
    }

    static async submit({ assignment_id, student_id, content, file_url, status = 'submitted', answers = [] }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            console.log('Submitting assignment:', { assignment_id, student_id, answersCount: answers.length });


            const submissionResult = await client.query(
                `INSERT INTO student_assignments (assignment_id, student_id, content, file_url, status, submitted_at)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                 ON CONFLICT (assignment_id, student_id) 
                 DO UPDATE SET 
                   content = EXCLUDED.content, 
                   file_url = EXCLUDED.file_url, 
                   status = EXCLUDED.status, 
                   submitted_at = CURRENT_TIMESTAMP
                 RETURNING *`,
                [assignment_id, student_id, content, file_url, status]
            );
            const submission = submissionResult.rows[0];


            let totalScore = 0;


            if (answers && answers.length > 0) {

                const questionsResult = await client.query(
                    'SELECT id, question_type, correct_answer, marks FROM assignment_questions WHERE assignment_id = $1',
                    [assignment_id]
                );
                const questionsMap = new Map(questionsResult.rows.map(q => [q.id, q]));

                for (const ans of answers) {
                    const question = questionsMap.get(ans.question_id);
                    let isCorrect = false;
                    let marks = 0;

                    if (question) {

                        if (['mcq', 'true_false'].includes(question.question_type)) {

                            if (String(ans.answer).trim().toLowerCase() === String(question.correct_answer).trim().toLowerCase()) {
                                isCorrect = true;
                                marks = parseFloat(question.marks) || 1;
                            }
                        }
                    }
                    totalScore += marks;


                    await client.query(
                        `INSERT INTO student_assignment_answers (assignment_submission_id, question_id, answer_text, is_correct, marks_awarded)
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (assignment_submission_id, question_id)
                         DO UPDATE SET answer_text = EXCLUDED.answer_text, is_correct = EXCLUDED.is_correct, marks_awarded = EXCLUDED.marks_awarded`,
                        [submission.id, ans.question_id, ans.answer, isCorrect, marks]
                    );
                }
            } else {

                const storedAnswers = await client.query(
                    'SELECT marks_awarded FROM student_assignment_answers WHERE assignment_submission_id = $1',
                    [submission.id]
                );
                totalScore = storedAnswers.rows.reduce((acc, row) => acc + (parseFloat(row.marks_awarded) || 0), 0);
            }



            if (status === 'submitted') {
                await client.query('UPDATE student_assignments SET score = $1, status = $2 WHERE id = $3', [totalScore, 'graded', submission.id]);






                const questionsCheck = await client.query(
                    `SELECT COUNT(*) as subjective_count FROM assignment_questions 
                     WHERE assignment_id = $1 AND question_type NOT IN ('mcq', 'true_false')`,
                    [assignment_id]
                );

                const hasSubjective = parseInt(questionsCheck.rows[0].subjective_count) > 0;
                const finalStatus = hasSubjective ? 'submitted' : 'graded';

                await client.query('UPDATE student_assignments SET score = $1, status = $2 WHERE id = $3', [totalScore, finalStatus, submission.id]);
                submission.score = totalScore;
                submission.status = finalStatus;
            } else {

                await client.query('UPDATE student_assignments SET score = $1 WHERE id = $2', [totalScore, submission.id]);
                submission.score = totalScore;
            }

            await client.query('COMMIT');
            return submission;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }


    static async getSubmissions(assignmentId) {
        const result = await pool.query(`
            SELECT sa.*, u.name as student_name, u.email as student_email, u.avatar as student_avatar
            FROM student_assignments sa
            JOIN users u ON sa.student_id = u.id
            WHERE sa.assignment_id = $1
            ORDER BY sa.submitted_at DESC
        `, [assignmentId]);
        return result.rows;
    }


    static async gradeSubmission(id, { score, feedback }) {
        const result = await pool.query(`
            UPDATE student_assignments
            SET score = $1, feedback = $2, status = 'graded', graded_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [score, feedback, id]);
        return result.rows[0];
    }

    static async addQuestion(data) {
        const { assignment_id, question_text, question_type, options, correct_answer, marks, order_index, required = true, media_url } = data;
        const result = await pool.query(`
            INSERT INTO assignment_questions (
                assignment_id, question_text, question_type, options, correct_answer, marks, order_index, required, media_url
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [assignment_id, question_text, question_type, options, correct_answer, marks, order_index, required, media_url]);
        return result.rows[0];
    }

    static async getQuestions(assignmentId) {
        const result = await pool.query(`
            SELECT * FROM assignment_questions 
            WHERE assignment_id = $1 
            ORDER BY order_index ASC
        `, [assignmentId]);
        return result.rows;
    }

    static async updateQuestion(id, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;

        Object.keys(data).forEach(key => {
            if (data[key] !== undefined) {
                fields.push(`${key} = $${paramIndex++}`);
                values.push(data[key]);
            }
        });

        values.push(id);
        const result = await pool.query(`
            UPDATE assignment_questions SET ${fields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);
        return result.rows[0];
    }

    static async deleteQuestion(id) {
        await pool.query('DELETE FROM assignment_questions WHERE id = $1', [id]);
    }


    static async saveAnswer({ assignment_submission_id, question_id, answer_text }) {

        const questionRes = await pool.query('SELECT * FROM assignment_questions WHERE id = $1', [question_id]);
        const question = questionRes.rows[0];

        let is_correct = null;
        let marks_awarded = null;

        if (question && (question.question_type === 'mcq' || question.question_type === 'true_false')) {
            is_correct = answer_text?.toLowerCase().trim() === question.correct_answer?.toLowerCase().trim();
            marks_awarded = is_correct ? question.marks : 0;
        }

        const result = await pool.query(`
            INSERT INTO student_assignment_answers (
                assignment_submission_id, question_id, answer_text, is_correct, marks_awarded
            )
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (assignment_submission_id, question_id)
            DO UPDATE SET 
                answer_text = EXCLUDED.answer_text,
                is_correct = EXCLUDED.is_correct,
                marks_awarded = EXCLUDED.marks_awarded,
                updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [assignment_submission_id, question_id, answer_text, is_correct, marks_awarded]);

        return result.rows[0];
    }

    static async getAnswers(submissionId) {
        const result = await pool.query(`
            SELECT saa.*, aq.question_text, aq.marks as max_marks
            FROM student_assignment_answers saa
            JOIN assignment_questions aq ON saa.question_id = aq.id
            WHERE saa.assignment_submission_id = $1
        `, [submissionId]);
        return result.rows;
    }
}

module.exports = AssignmentModel;
