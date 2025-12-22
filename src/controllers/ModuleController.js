const ModuleService = require('../services/ModuleService');
const ProgressModel = require('../models/ProgressModel'); // Import ProgressModel
const LessonService = require('../services/LessonService'); // Import LessonService

class ModuleController {
    static async getAll(req, res) {
        try {
            const { subjectId } = req.query;
            if (subjectId) {
                const modules = await ModuleService.getModulesBySubject(subjectId);
                return res.json(modules);
            }

            const pool = require('../db/pool');


            if (req.user?.role === 'teacher') {
                const result = await pool.query(`
                    SELECT m.*, 
                           COUNT(DISTINCT l.id) as lesson_count,
                           SUM(l.duration_minutes) as duration_minutes
                    FROM modules m
                    JOIN subjects s ON m.subject_id = s.id
                    JOIN teacher_subjects ts ON ts.subject_id = s.id
                    LEFT JOIN lessons l ON m.id = l.module_id
                    WHERE ts.teacher_id = $1
                    GROUP BY m.id
                    ORDER BY m.created_at DESC
                `, [req.user.id]);
                return res.json(result.rows);
            }

            if (req.user?.role === 'admin') {
                const result = await pool.query(`
                    SELECT m.*, 
                           COUNT(DISTINCT l.id) as lesson_count,
                           SUM(l.duration_minutes) as duration_minutes
                    FROM modules m
                    LEFT JOIN lessons l ON m.id = l.module_id
                    GROUP BY m.id
                    ORDER BY m.created_at DESC
                `);
                return res.json(result.rows);
            }

            return res.json([]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch modules' });
        }
    }



    static async getBySubject(req, res) {
        try {
            const { subjectId } = req.params;
            let modules = await ModuleService.getModulesBySubject(subjectId);

            if (req.user && req.user.role === 'student') {
                const modules = await ModuleService.getModulesWithProgress(req.user.id, subjectId);
                return res.json(modules);
            }

            res.json(modules);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch modules' });
        }
    }

    static async create(req, res) {
        try {
            const { subject_id, title } = req.body;
            if (!title) return res.status(400).json({ error: 'Title is required' });
            if (!subject_id) return res.status(400).json({ error: 'Subject is required' });

            const module = await ModuleService.createModule(req.body);
            res.status(201).json(module);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create module' });
        }
    }
    static async update(req, res) {
        try {
            const module = await ModuleService.updateModule(req.params.id, req.body);
            res.json(module);
        } catch (error) {
            if (error.message === 'Module not found') return res.status(404).json({ error: error.message });
            console.error(error);
            res.status(500).json({ error: 'Failed to update module' });
        }
    }

    static async delete(req, res) {
        try {
            const result = await ModuleService.deleteModule(req.params.id);
            res.json(result);
        } catch (error) {
            if (error.message === 'Module not found') return res.status(404).json({ error: error.message });
            console.error(error);
            res.status(500).json({ error: 'Failed to delete module' });
        }
    }
}

module.exports = ModuleController;
