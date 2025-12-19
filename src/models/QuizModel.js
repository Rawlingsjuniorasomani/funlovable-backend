const pool = require('../db/pool');

class QuizModel {
    // Create quiz with enhanced fields
    static async create(data) {
        const {
            teacher_id, subject_id, module_id, title,
            description = '',
            quiz_type = 'standard',
            duration_minutes = 30,
            total_marks = 100,
            start_date = new Date(),
            end_date = null,
            instructions = '',
            class_name = '',
            randomize_questions = false,
            max_attempts = 1,
            allow_review = true
        } = data;

        const result = await pool.query(`
            INSERT INTO quizzes (
                teacher_id, subject_id, module_id, title, description,
                quiz_type, duration_minutes, total_marks, start_date, end_date,
                instructions, class_name, randomize_questions, max_attempts, allow_review
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            teacher_id, subject_id, module_id, title, description,
            quiz_type, duration_minutes, total_marks, start_date, end_date,
            instructions, class_name, randomize_questions, max_attempts, allow_review
        ]);

        return result.rows[0];
    }

    static async getAllQuizzes(filters = {}) {
        let query = `
            SELECT q.*, s.name as subject_name,
                   (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
            FROM quizzes q
            LEFT JOIN subjects s ON q.subject_id = s.id
        `;
        const params = [];

        if (filters.teacher_id) {
            query += ` WHERE s.teacher_id = $1`;
            params.push(filters.teacher_id);
        }

        query += ` ORDER BY q.created_at DESC`;

        const result = await pool.query(query, params);
        return result.rows;
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
            UPDATE quizzes SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramIndex}
            RETURNING *
        `, values);

        return result.rows[0];
    }

    static async publish(id) {
        const result = await pool.query(`
            UPDATE quizzes SET published = true WHERE id = $1 RETURNING *
        `, [id]);
        return result.rows[0];
    }

    static async getById(id) {
        const result = await pool.query('SELECT * FROM quizzes WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async getBySubject(subjectId) {
        const result = await pool.query(`
            SELECT * FROM quizzes WHERE subject_id = $1 ORDER BY created_at DESC
        `, [subjectId]);
        return result.rows;
    }

    static async getAvailable(studentId) {
        const result = await pool.query(`
            SELECT q.*, 
                   COUNT(qa.id) as attempt_count,
                   MAX(qa.score) as best_score
            FROM quizzes q
            LEFT JOIN quiz_attempts qa ON q.id = qa.quiz_id AND qa.student_id = $1
            WHERE q.published = true
              AND (q.start_date IS NULL OR q.start_date <= CURRENT_TIMESTAMP)
              AND (q.end_date IS NULL OR q.end_date >= CURRENT_TIMESTAMP)
            GROUP BY q.id
            HAVING COUNT(qa.id) < q.max_attempts OR q.max_attempts IS NULL
            ORDER BY q.start_date DESC
        `, [studentId]);
        return result.rows;
    }

    // Question management
    static async addQuestion(data) {
        const { quiz_id, question_type, question, options, correct_answer, marks, order_index } = data;

        const result = await pool.query(`
            INSERT INTO quiz_questions (quiz_id, question_type, question_text, options, correct_answer, marks, order_index)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *, question_text as question
        `, [quiz_id, question_type, question, options, correct_answer, marks, order_index]);

        return result.rows[0];
    }

    static async getQuestions(quizId, randomize = false) {
        const orderBy = randomize ? 'RANDOM()' : 'order_index ASC';
        const result = await pool.query(`
            SELECT *, question_text as question FROM quiz_questions WHERE quiz_id = $1 ORDER BY ${orderBy}
        `, [quizId]);
        return result.rows;
    }

    static async updateQuestion(id, data) {
        const { question, options, correct_answer, marks } = data;
        const result = await pool.query(`
            UPDATE quiz_questions 
            SET question_text = COALESCE($1, question_text),
                options = COALESCE($2, options),
                correct_answer = COALESCE($3, correct_answer),
                marks = COALESCE($4, marks)
            WHERE id = $5
            RETURNING *, question_text as question
        `, [question, options, correct_answer, marks, id]);
        return result.rows[0];
    }

    static async deleteQuestion(id) {
        await pool.query('DELETE FROM quiz_questions WHERE id = $1', [id]);
    }

    // Attempt management
    static async startAttempt(quizId, studentId) {
        const result = await pool.query(`
            INSERT INTO quiz_attempts (quiz_id, student_id, start_time, status)
            VALUES ($1, $2, CURRENT_TIMESTAMP, 'in_progress')
            RETURNING *
        `, [quizId, studentId]);
        return result.rows[0];
    }

    static async getAttempt(attemptId) {
        const result = await pool.query(`
            SELECT qa.*, q.duration_minutes, q.allow_review
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            WHERE qa.id = $1
        `, [attemptId]);
        return result.rows[0];
    }

    static async getAttemptsByQuiz(quizId) {
        const result = await pool.query(`
            SELECT qa.*, u.name as student_name, u.email as student_email
            FROM quiz_attempts qa
            JOIN users u ON qa.student_id::text = u.id
            WHERE qa.quiz_id = $1
            ORDER BY qa.created_at DESC
        `, [quizId]);
        return result.rows;
    }

    // Answer management
    static async saveAnswer(data) {
        const { attempt_id, question_id, answer } = data;

        const result = await pool.query(`
            INSERT INTO quiz_answers (attempt_id, question_id, answer)
            VALUES ($1, $2, $3)
            ON CONFLICT (attempt_id, question_id) 
            DO UPDATE SET answer = EXCLUDED.answer, updated_at = CURRENT_TIMESTAMP
            RETURNING *
        `, [attempt_id, question_id, answer]);

        return result.rows[0];
    }

    static async getAnswers(attemptId) {
        const result = await pool.query(`
            SELECT qa.*, qq.question_text as question, qq.correct_answer, qq.marks, qq.question_type
            FROM quiz_answers qa
            JOIN quiz_questions qq ON qa.question_id = qq.id
            WHERE qa.attempt_id = $1
        `, [attemptId]);
        return result.rows;
    }

    static async gradeAnswer(answerId, marksAwarded, feedback) {
        const result = await pool.query(`
            UPDATE quiz_answers 
            SET marks_awarded = $1, teacher_feedback = $2, updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
        `, [marksAwarded, feedback, answerId]);
        return result.rows[0];
    }

    // Submit and auto-grade
    static async submitAttempt(attemptId, timeTaken) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Get all answers with questions
            const answers = await client.query(`
                SELECT qa.*, qq.correct_answer, qq.marks, qq.question_type
                FROM quiz_answers qa
                JOIN quiz_questions qq ON qa.question_id = qq.id
                WHERE qa.attempt_id = $1
            `, [attemptId]);

            let autoGradedScore = 0;

            // Auto-grade objective questions
            for (const answer of answers.rows) {
                if (answer.question_type === 'mcq' || answer.question_type === 'true_false') {
                    const isCorrect = answer.answer.toLowerCase().trim() === answer.correct_answer.toLowerCase().trim();
                    const marksAwarded = isCorrect ? answer.marks : 0;

                    await client.query(`
                        UPDATE quiz_answers 
                        SET is_correct = $1, marks_awarded = $2
                        WHERE id = $3
                    `, [isCorrect, marksAwarded, answer.id]);

                    autoGradedScore += marksAwarded;
                }
            }

            // Update attempt
            const result = await client.query(`
                UPDATE quiz_attempts 
                SET status = 'submitted',
                    end_time = CURRENT_TIMESTAMP,
                    time_taken_seconds = $1,
                    auto_graded_score = $2,
                    is_released = true 
                WHERE id = $3
                RETURNING *
            `, [timeTaken, autoGradedScore, attemptId]);

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async releaseResults(attemptId) {
        const result = await pool.query(`
            UPDATE quiz_attempts SET is_released = true WHERE id = $1 RETURNING *
        `, [attemptId]);
        return result.rows[0];
    }

    static async updateAttemptFeedback(attemptId, feedback, manualScore) {
        const result = await pool.query(`
            UPDATE quiz_attempts 
            SET teacher_feedback = $1, manual_graded_score = $2, status = 'graded'
            WHERE id = $3
            RETURNING *
        `, [feedback, manualScore, attemptId]);
        return result.rows[0];
    }
}

module.exports = QuizModel;
