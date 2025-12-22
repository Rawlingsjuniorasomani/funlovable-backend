const SubjectModel = require('../models/SubjectModel');

class SubjectService {
    static async getAllSubjects() {
        return await SubjectModel.findAll();
    }

    static async getSubjectById(id) {
        const subject = await SubjectModel.findById(id);
        if (!subject) {
            throw new Error('Subject not found');
        }
        return subject;
    }

    static async createSubject(data, user = null) {
        const subject = await SubjectModel.create(data);

        
        if (user && user.role === 'teacher') {
            await SubjectModel.linkTeacher(user.id, subject.id);
        }

        return subject;
    }

    static async updateSubject(id, data) {
        const subject = await SubjectModel.update(id, data);
        if (!subject) {
            throw new Error('Subject not found');
        }
        return subject;
    }

    static async deleteSubject(id) {
        const subject = await SubjectModel.delete(id);
        if (!subject) {
            throw new Error('Subject not found');
        }
        return { message: 'Subject deleted successfully' };
    }

    static async getTeacherSubjects(teacherId) {
        return await SubjectModel.findByTeacherId(teacherId);
    }
}

module.exports = SubjectService;
