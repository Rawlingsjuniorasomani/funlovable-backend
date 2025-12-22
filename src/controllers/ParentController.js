const ParentService = require('../services/ParentService');

class ParentController {
    static async addChild(req, res) {
        try {




            const { name, age, grade, subjects, phone, school } = req.body;
            console.log('Adding child:', { name, age, grade, subjectsCount: subjects?.length });


            const parentId = req.user.id;
            const existingChildren = await ParentService.getChildren(parentId);
            const currentCount = existingChildren.length;


            const subscription = await require('../models/SubscriptionModel').findByParent(parentId);
            const planName = subscription?.status === 'active' ? subscription.plan_name : null;





            const pool = require('../db/pool');
            const subRes = await pool.query(`
                SELECT s.status, p.plan_name 
                FROM subscriptions s
                JOIN plans p ON s.plan = p.id
                WHERE s.user_id = $1 AND s.status = 'active'
            `, [parentId]);

            const activeSub = subRes.rows[0];
            const isFamily = activeSub?.plan_name === 'Family Plan';
            const isSingle = activeSub?.plan_name === 'Single Child';

            let limit = 0;
            if (isFamily) limit = 5;
            else if (isSingle) limit = 1;


            if (currentCount >= limit) {
                return res.status(403).json({
                    error: 'Subscription limit reached',
                    code: 'LIMIT_REACHED',
                    message: limit === 1
                        ? 'Upgrade to Family Plan to add more children.'
                        : 'Maximum number of children reached for your plan.'
                });
            }

            const result = await ParentService.addChild(req.user.id, { name, age, grade, subjects, phone, school });

            res.status(201).json({
                message: 'Child added successfully',
                child: result.child,
                studentCredentials: result.studentUser
            });
        } catch (error) {
            console.error('Add Child Error:', error);
            const statusCode = Number(error.statusCode) || 500;
            res.status(statusCode).json({
                error: statusCode === 500 ? 'Failed to add child' : error.message,
                code: error.code,
                meta: error.meta,
                details: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    static async getChildren(req, res) {
        try {
            const children = await ParentService.getChildren(req.user.id);
            res.json(children);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch children' });
        }
    }

    static async getChildProgress(req, res) {
        try {
            const { childId } = req.params;

            const children = await ParentService.getChildren(req.user.id);
            const isLinked = children.some(c => c.id === childId);

            if (!isLinked) {
                return res.status(403).json({ error: 'Unauthorized access to this child' });
            }

            const progress = await ParentService.getChildProgress(childId);
            if (!progress) {
                return res.status(404).json({ error: 'Child not found' });
            }

            res.json(progress);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch child progress' });
        }
    }
    static async getChildModules(req, res) {
        try {
            const { childId, subjectId } = req.params;
            // Verify parent access
            const hasAccess = await ParentService.verifyParentAccess(req.user.id, childId);
            if (!hasAccess) return res.status(403).json({ error: 'Unauthorized' });

            const modules = await require('../services/ModuleService').getModulesWithProgress(childId, subjectId);
            res.json(modules);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch child modules' });
        }
    }

    static async getChildLessons(req, res) {
        try {
            const { childId, moduleId } = req.params;
            // Verify parent access
            const hasAccess = await ParentService.verifyParentAccess(req.user.id, childId);
            if (!hasAccess) return res.status(403).json({ error: 'Unauthorized' });

            const lessons = await require('../services/LessonService').getLessonsWithProgress(childId, moduleId);
            res.json(lessons);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch child lessons' });
        }
    }
}

module.exports = ParentController;
