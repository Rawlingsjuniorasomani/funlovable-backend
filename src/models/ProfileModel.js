const pool = require('../db/pool');

class ProfileModel {
    static async createParent(userId) {
        const result = await pool.query(
            `INSERT INTO parents (user_id) VALUES ($1) RETURNING *`,
            [userId]
        );
        return result.rows[0];
    }

    static async createTeacher(userId, bio, qualifications, school, yearsOfExperience, address, subjectId) {
        const client = await pool.connect();
        console.log('ProfileModel.createTeacher called with:', { userId, subjectId, school }); // Debug log
        try {
            await client.query('BEGIN');

            const result = await client.query(
                `INSERT INTO teachers (user_id, bio, qualifications, school, years_of_experience, address) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING *`,
                [userId, bio, qualifications, school, yearsOfExperience, address]
            );

            if (subjectId) {
                await client.query(
                    `INSERT INTO teacher_subjects (teacher_id, subject_id) VALUES ($1, $2)`,
                    [userId, subjectId]
                );
            }

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            console.error('Error in createTeacher:', error); // Added logging
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    static async createStudent(userId, childId) {

        const result = await pool.query(
            `INSERT INTO students (user_id, child_id) VALUES ($1, $2) RETURNING *`,
            [userId, childId]
        );
        return result.rows[0];
    }

    static async createChild({ parentId, name, age, grade, avatar }) {
        const result = await pool.query(
            `INSERT INTO children (parent_id, name, age, grade, avatar)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [parentId, name, age, grade, avatar]
        );
        return result.rows[0];
    }

    static async getChildrenByParent(parentId) {
        const result = await pool.query('SELECT * FROM children WHERE parent_id = $1', [parentId]);
        return result.rows;
    }
}

module.exports = ProfileModel;
