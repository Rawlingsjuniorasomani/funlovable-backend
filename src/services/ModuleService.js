const ModuleModel = require('../models/ModuleModel');

const LessonService = require('./LessonService');
const ProgressModel = require('../models/ProgressModel');

class ModuleService {
    static async getModulesBySubject(subjectId) {
        return await ModuleModel.findAllBySubjectId(subjectId);
    }

    static async getModulesWithProgress(studentId, subjectId) {
        const modules = await ModuleModel.findAllBySubjectId(subjectId);

        const enhancedModules = [];
        let previousModuleComplete = true;

        for (const mod of modules) {
            let isLocked = false;

            // Logic: Locked if previous module not complete.
            if (!previousModuleComplete) {
                isLocked = true;
            }

            // Check if THIS module is complete (to set flag for NEXT module)
            const lessons = await LessonService.getLessonsByModule(mod.id);
            const progress = await ProgressModel.getModuleProgress(studentId, mod.id);
            const progressMap = {};
            progress.forEach(p => progressMap[p.lesson_id] = p);

            const allLessonsComplete = lessons.length > 0 && lessons.every(l => {
                const p = progressMap[l.id];
                return p && p.is_completed;
            });

            previousModuleComplete = allLessonsComplete;

            enhancedModules.push({
                ...mod,
                is_locked: isLocked,
                is_completed: allLessonsComplete
            });
        }
        return enhancedModules;
    }


    static async getModuleById(id) {
        const module = await ModuleModel.findById(id);
        if (!module) throw new Error('Module not found');
        return module;
    }

    static async createModule(data) {
        return await ModuleModel.create(data);
    }
    static async updateModule(id, data) {
        const module = await ModuleModel.update(id, data);
        if (!module) throw new Error('Module not found');
        return module;
    }

    static async deleteModule(id) {
        const module = await ModuleModel.delete(id);
        if (!module) throw new Error('Module not found');
        return { message: 'Module deleted' };
    }
}

module.exports = ModuleService;
