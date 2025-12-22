const pool = require('../db/pool');
const UserModel = require('../models/UserModel');
const bcrypt = require('bcryptjs');

class HttpError extends Error {
    constructor(message, statusCode, code, meta) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.meta = meta;
    }
}

class ParentService {
    static async addChild(parentId, childData) {



        const countRes = await pool.query(
            'SELECT COUNT(*)::int as count FROM parent_children WHERE parent_id = $1',
            [parentId]
        );
        const currentCount = Number(countRes.rows[0]?.count || 0);

        const subRes = await pool.query(
            `SELECT plan
             FROM subscriptions
             WHERE user_id = $1 AND status = 'active' AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [parentId]
        );

        let maxChildren = 1;
        const planId = subRes.rows[0]?.plan || null;

        if (planId) {
            const planRes = await pool.query(
                'SELECT plan_name, price, features FROM plans WHERE id = $1',
                [planId]
            );

            const plan = planRes.rows[0];
            const planName = (plan?.plan_name || '').toLowerCase();
            const price = plan?.price != null ? Number(plan.price) : null;
            const features = plan?.features;

            if (features && typeof features === 'object' && !Array.isArray(features) && typeof features.maxChildren === 'number') {
                maxChildren = Number(features.maxChildren);
            } else if (planName.includes('family')) {
                maxChildren = 4;
            } else if (price != null) {
                maxChildren = price >= 1300 ? 4 : 1;
            }
        }

        if (currentCount >= maxChildren) {
            throw new HttpError(
                `Plan limit reached. Your plan allows max ${maxChildren} child${maxChildren === 1 ? '' : 'ren'}.`,
                403,
                'PLAN_LIMIT_REACHED',
                { maxChildren, currentCount }
            );
        }


        if (childData.phone) {
            const existingStudent = await pool.query(
                `SELECT * FROM users WHERE phone = $1 AND role = 'student'`,
                [childData.phone]
            );

            if (existingStudent.rows.length > 0) {
                const studentId = existingStudent.rows[0].id;


                const existingLink = await pool.query(
                    `SELECT * FROM parent_children WHERE parent_id = $1 AND child_id = $2`,
                    [parentId, studentId]
                );

                if (existingLink.rows.length === 0) {
                    await pool.query(
                        `INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2)`,
                        [parentId, studentId]
                    );
                }

                return {
                    child: existingStudent.rows[0],
                    studentUser: { email: existingStudent.rows[0].email }
                };
            }
        }


        const studentEmail = `${childData.name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}${Math.floor(Math.random() * 10000)}@funlovable.com`;
        const defaultPassword = 'password123';
        const hash = await bcrypt.hash(defaultPassword, 10);


        const studentUser = await UserModel.create({
            name: childData.name,
            email: studentEmail,
            passwordHash: hash,
            role: 'student',
            phone: childData.phone || null,
            isApproved: true,
            school: childData.school || null,
            age: parseInt(childData.age) || 0,
            studentClass: childData.grade
        });


        await pool.query(
            `INSERT INTO parent_children (parent_id, child_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [parentId, studentUser.id]
        );


        await pool.query(
            `INSERT INTO user_xp (user_id, total_xp, level) VALUES ($1, 0, 1) ON CONFLICT DO NOTHING`,
            [studentUser.id]
        );


        if (childData.subjects && Array.isArray(childData.subjects) && childData.subjects.length > 0) {
            for (const subjectId of childData.subjects) {
                await pool.query(
                    `INSERT INTO student_subjects (student_id, subject_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [studentUser.id, subjectId]
                );
            }
        }

        return {
            child: studentUser,
            studentUser: { email: studentEmail, password: defaultPassword }
        };
    }

    static async verifyParentAccess(parentId, childId) {
        const result = await pool.query(
            `SELECT * FROM parent_children WHERE parent_id = $1 AND child_id = $2`,
            [parentId, childId]
        );
        return result.rows.length > 0;
    }

    static async getChildren(userId) {
        const result = await pool.query(`
            SELECT u.id, u.name, u.email, u.avatar, u.created_at, u.student_class as grade, u.age,
                   COALESCE(ux.total_xp, 0) as total_xp, COALESCE(ux.level, 1) as level
            FROM users u
            INNER JOIN parent_children pc ON u.id = pc.child_id
            LEFT JOIN user_xp ux ON u.id = ux.user_id
            WHERE pc.parent_id = $1
        `, [userId]);

        return result.rows;
    }

    static async getChildProgress(childId) {

        const childResult = await pool.query(`
            SELECT u.id, u.name, u.avatar, COALESCE(ux.total_xp, 0) as total_xp, COALESCE(ux.level, 1) as level
            FROM users u
            LEFT JOIN user_xp ux ON u.id = ux.user_id
            WHERE u.id = $1
        `, [childId]);

        if (childResult.rows.length === 0) return null;
        const child = childResult.rows[0];


        const subjectsResult = await pool.query(`
            SELECT s.name as subject, 
                   COUNT(distinct qa.id) as quizzes_taken,
                   AVG(qa.score) as avg_score
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN modules m ON q.module_id = m.id
            JOIN subjects s ON m.subject_id = s.id
            WHERE qa.user_id = $1
            GROUP BY s.name
        `, [childId]);


        const activityResult = await pool.query(`
            SELECT qa.id, 'quiz' as type, q.title, s.name as subject, qa.score, qa.created_at as date
            FROM quiz_attempts qa
            JOIN quizzes q ON qa.quiz_id = q.id
            JOIN modules m ON q.module_id = m.id
            JOIN subjects s ON m.subject_id = s.id
            WHERE qa.user_id = $1
            ORDER BY qa.created_at DESC
            LIMIT 10
        `, [childId]);

        return {
            child,
            overview: {
                total_xp: child.total_xp,
                level: child.level,
                average_score: Math.round(subjectsResult.rows.reduce((acc, curr) => acc + parseFloat(curr.avg_score), 0) / (subjectsResult.rows.length || 1))
            },
            subjects: subjectsResult.rows.map(row => ({
                subject: row.subject,
                grade: row.avg_score >= 90 ? 'A' : row.avg_score >= 80 ? 'B' : row.avg_score >= 70 ? 'C' : 'D',
                score: Math.round(row.avg_score),
                quizzesTaken: parseInt(row.quizzes_taken)
            })),
            recent_activity: activityResult.rows
        };
    }
}

module.exports = ParentService;
