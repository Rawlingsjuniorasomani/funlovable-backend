const LessonService = require('../services/LessonService');
const ProgressModel = require('../models/ProgressModel'); // Import ProgressModel

class LessonController {
    static async getAll(req, res) {
        try {
            const { moduleId } = req.query;
            if (moduleId) {
                const lessons = await LessonService.getLessonsByModule(moduleId);
                return res.json(lessons);
            }
            return res.json([]);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch lessons' });
        }
    }

    static async getByModule(req, res) {
        try {
            const { moduleId } = req.params;
            let lessons = await LessonService.getLessonsByModule(moduleId);

            // Gating Logic for Students
            if (req.user && req.user.role === 'student') {
                const lessons = await LessonService.getLessonsWithProgress(req.user.id, moduleId);
                return res.json(lessons);
            }

            res.json(lessons);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch lessons' });
        }
    }

    static async create(req, res) {
        try {
            const lesson = await LessonService.createLesson(req.body);
            res.status(201).json(lesson);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create lesson' });
        }
    }
    static async update(req, res) {
        try {
            const lesson = await LessonService.updateLesson(req.params.id, req.body);
            res.json(lesson);
        } catch (error) {
            if (error.message === 'Lesson not found') return res.status(404).json({ error: error.message });
            console.error(error);
            res.status(500).json({ error: 'Failed to update lesson' });
        }
    }

    static async delete(req, res) {
        try {
            const result = await LessonService.deleteLesson(req.params.id);
            res.json(result);
        } catch (error) {
            if (error.message === 'Lesson not found') return res.status(404).json({ error: error.message });
            console.error(error);
            res.status(500).json({ error: 'Failed to delete lesson' });
        }
    }
}

module.exports = LessonController;
