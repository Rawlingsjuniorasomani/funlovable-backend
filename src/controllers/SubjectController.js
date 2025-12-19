const SubjectService = require('../services/SubjectService');

class SubjectController {
    static async getAll(req, res) {
        try {
            const subjects = await SubjectService.getAllSubjects();
            const seen = new Set();
            const unique = [];
            for (const s of Array.isArray(subjects) ? subjects : []) {
                const key = String(s?.name || '').trim().toLowerCase();
                if (!key) continue;
                if (seen.has(key)) continue;
                seen.add(key);
                unique.push(s);
            }
            res.json(unique);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch subjects' });
        }
    }

    static async getOne(req, res) {
        try {
            const subject = await SubjectService.getSubjectById(req.params.id);
            res.json(subject);
        } catch (error) {
            if (error.message === 'Subject not found') {
                return res.status(404).json({ error: error.message });
            }
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch subject' });
        }
    }

    static async create(req, res) {
        try {
            // Pass req.user to service to handle linking
            const subject = await SubjectService.createSubject(req.body, req.user);
            res.status(201).json(subject);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create subject' });
        }
    }

    static async update(req, res) {
        try {
            const subject = await SubjectService.updateSubject(req.params.id, req.body);
            res.json(subject);
        } catch (error) {
            if (error.message === 'Subject not found') {
                return res.status(404).json({ error: error.message });
            }
            console.error(error);
            res.status(500).json({ error: 'Failed to update subject' });
        }
    }

    static async delete(req, res) {
        try {
            const result = await SubjectService.deleteSubject(req.params.id);
            res.json(result);
        } catch (error) {
            if (error.message === 'Subject not found') {
                return res.status(404).json({ error: error.message });
            }
            console.error(error);
            res.status(500).json({ error: 'Failed to delete subject' });
        }
    }

    static async getTeacherSubjects(req, res) {
        try {
            // Using req.user.id from authMiddleware
            const subjects = await SubjectService.getTeacherSubjects(req.user.id);
            res.json(subjects);
        } catch (error) {
            console.error("Error fetching teacher subjects:", error);
            res.status(500).json({ error: 'Failed to fetch teacher subjects' });
        }
    }
}

module.exports = SubjectController;
