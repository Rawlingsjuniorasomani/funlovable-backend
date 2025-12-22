const LessonModel = require('../models/LessonModel');

const ProgressModel = require('../models/ProgressModel');

class LessonService {
    static async getLessonsByModule(moduleId) {
        return await LessonModel.findAllByModuleId(moduleId);
    }

    static async getLessonsWithProgress(studentId, moduleId) {
        let lessons = await LessonModel.findAllByModuleId(moduleId);
        const progress = await ProgressModel.getModuleProgress(studentId, moduleId);

        const progressMap = {};
        progress.forEach(p => progressMap[p.lesson_id] = p);

        return lessons.map((lesson, index) => {
            let isLocked = false;
            // Logic: First lesson is always unlocked.
            // Subsequent lessons are locked if the PREVIOUS lesson is not completed.
            if (index > 0) {
                const prevLesson = lessons[index - 1];
                const prevProg = progressMap[prevLesson.id];
                if (!prevProg || !prevProg.is_completed) {
                    isLocked = true;
                }
            }

            const currentProg = progressMap[lesson.id];
            return {
                ...lesson,
                is_locked: isLocked,
                is_completed: currentProg ? currentProg.is_completed : false,
                quiz_passed: currentProg ? currentProg.quiz_passed : false,
                quiz_score: currentProg ? currentProg.quiz_score : null
            };
        });
    }

    static async getLessonById(id) {

        const lesson = await LessonModel.findById(id);
        if (!lesson) throw new Error('Lesson not found');
        return lesson;
    }

    static async createLesson(data) {
        return await LessonModel.create(data);
    }
    static async updateLesson(id, data) {
        const lesson = await LessonModel.update(id, data);
        if (!lesson) throw new Error('Lesson not found');
        return lesson;
    }

    static async deleteLesson(id) {
        const lesson = await LessonModel.delete(id);
        if (!lesson) throw new Error('Lesson not found');
        return { message: 'Lesson deleted' };
    }
}

module.exports = LessonService;
