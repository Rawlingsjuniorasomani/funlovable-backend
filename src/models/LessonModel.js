const pool = require('../db/pool');

class LessonModel {
    static async findAllByModuleId(moduleId) {
        const result = await pool.query(
            `SELECT l.*, q.id as quiz_id 
             FROM lessons l 
             LEFT JOIN quizzes q ON l.id = q.lesson_id 
             WHERE l.module_id = $1 
             ORDER BY l.order_index`,
            [moduleId]
        );
        return result.rows;
    }

    static async findById(id) {
        const result = await pool.query('SELECT * FROM lessons WHERE id = $1', [id]);
        return result.rows[0];
    }

    static async create({ module_id, title, content, video_url, order_index }) {
        const result = await pool.query(
            `INSERT INTO lessons (module_id, title, content, video_url, order_index)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [module_id, title, content, video_url, order_index]
        );
        return result.rows[0];
    }

    static async update(id, { title, content, video_url, order_index }) {
        const result = await pool.query(
            `UPDATE lessons 
         SET title = COALESCE($2, title),
             content = COALESCE($3, content),
             video_url = COALESCE($4, video_url),
             order_index = COALESCE($5, order_index)
         WHERE id = $1
         RETURNING *`,
            [id, title, content, video_url, order_index]
        );
        return result.rows[0];
    }

    static async delete(id) {
        const result = await pool.query('DELETE FROM lessons WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    }
}

module.exports = LessonModel;
