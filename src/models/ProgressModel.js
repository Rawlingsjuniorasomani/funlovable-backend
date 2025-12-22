const pool = require('../db/pool');

class ProgressModel {
    static async trackLessonView(data) {
        const { lesson_id, student_id, duration_seconds, completed } = data;

        // 1. Log the view for analytics (keep existing logic)
        await pool.query(`
            INSERT INTO lesson_views (lesson_id, student_id, duration_seconds, completed)
            VALUES ($1, $2, $3, $4)
        `, [lesson_id, student_id, duration_seconds || 0, completed || false]);

        // 2. Update the master progress record
        const result = await pool.query(`
            INSERT INTO user_progress (user_id, lesson_id, is_completed, time_spent_minutes, created_at, completed_at)
            VALUES ($1, $2, $3, $4, NOW(), CASE WHEN $3 = true THEN NOW() ELSE NULL END)
            ON CONFLICT (user_id, lesson_id)
            DO UPDATE SET
                time_spent_minutes = user_progress.time_spent_minutes + EXCLUDED.time_spent_minutes,
                is_completed = user_progress.is_completed OR EXCLUDED.is_completed,
                completed_at = CASE 
                    WHEN user_progress.completed_at IS NOT NULL THEN user_progress.completed_at
                    WHEN EXCLUDED.is_completed THEN NOW()
                    ELSE NULL
                END
            RETURNING *
        `, [student_id, lesson_id, completed || false, Math.ceil((duration_seconds || 0) / 60)]);

        return result.rows[0];
    }

    static async updateQuizProgress(userId, lessonId, score, passed) {
        const result = await pool.query(`
            INSERT INTO user_progress (user_id, lesson_id, quiz_score, quiz_passed, is_completed, completed_at)
            VALUES ($1, $2, $3, $4, $4, CASE WHEN $4 = true THEN NOW() ELSE NULL END)
            ON CONFLICT (user_id, lesson_id)
            DO UPDATE SET
                quiz_score = GREATEST(user_progress.quiz_score, EXCLUDED.quiz_score),
                quiz_passed = user_progress.quiz_passed OR EXCLUDED.quiz_passed,
                is_completed = user_progress.is_completed OR EXCLUDED.is_completed,
                completed_at = CASE 
                    WHEN user_progress.completed_at IS NOT NULL THEN user_progress.completed_at
                    WHEN EXCLUDED.quiz_passed THEN NOW()
                    ELSE NULL
                END
            RETURNING *
        `, [userId, lessonId, score, passed]);
        return result.rows[0];
    }

    static async getStudentProgress(studentId, filters = {}) {
        let query = `
            SELECT up.*, l.title as lesson_title, m.title as module_title, m.id as module_id
            FROM user_progress up
            JOIN lessons l ON up.lesson_id = l.id
            JOIN modules m ON l.module_id = m.id
            WHERE up.user_id = $1
        `;
        const params = [studentId];
        let paramIndex = 2;

        if (filters.lesson_id) {
            query += ` AND up.lesson_id = $${paramIndex++}`;
            params.push(filters.lesson_id);
        }

        query += ' ORDER BY up.created_at DESC';

        const result = await pool.query(query, params);
        return result.rows;
    }

    static async getModuleProgress(studentId, moduleId) {
        const result = await pool.query(`
            SELECT up.*, l.order_index
            FROM user_progress up
            JOIN lessons l ON up.lesson_id = l.id
            WHERE up.user_id = $1 AND l.module_id = $2
        `, [studentId, moduleId]);
        return result.rows;
    }

    static async updateAnalytics(data) {
        const { student_id, subject_id, week_start, lessons_viewed, assignments_submitted, quizzes_taken, avg_quiz_score, total_time_minutes } = data;

        const result = await pool.query(`
            INSERT INTO learning_analytics 
            (student_id, subject_id, week_start, lessons_viewed, assignments_submitted, quizzes_taken, avg_quiz_score, total_time_minutes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (student_id, subject_id, week_start)
            DO UPDATE SET
                lessons_viewed = learning_analytics.lessons_viewed + EXCLUDED.lessons_viewed,
                assignments_submitted = learning_analytics.assignments_submitted + EXCLUDED.assignments_submitted,
                quizzes_taken = learning_analytics.quizzes_taken + EXCLUDED.quizzes_taken,
                avg_quiz_score = EXCLUDED.avg_quiz_score,
                total_time_minutes = learning_analytics.total_time_minutes + EXCLUDED.total_time_minutes
            RETURNING *
        `, [student_id, subject_id, week_start, lessons_viewed || 0, assignments_submitted || 0, quizzes_taken || 0, avg_quiz_score, total_time_minutes || 0]);

        return result.rows[0];
    }

    static async getAnalytics(studentId, subjectId = null) {
        let query = `
            SELECT * FROM learning_analytics
            WHERE student_id = $1
        `;
        const params = [studentId];

        if (subjectId) {
            query += ' AND subject_id = $2';
            params.push(subjectId);
        }

        query += ' ORDER BY week_start DESC LIMIT 12';

        const result = await pool.query(query, params);
        return result.rows;
    }
}

module.exports = ProgressModel;
