const AssignmentModel = require('../models/AssignmentModel');

class AssignmentService {
    static async createAssignment(data) {
        return await AssignmentModel.create(data);
    }

    static async getAssignmentsBySubject(subjectId) {
        return await AssignmentModel.findAllBySubject(subjectId);
    }

    static async getAssignmentsByTeacher(teacherId) {
        return await AssignmentModel.findAllByTeacher(teacherId);
    }

    static async getAssignmentsByStudent(studentId) {
        return await AssignmentModel.findAllByStudent(studentId);
    }

    static async getAssignmentById(id) {
        const assignment = await AssignmentModel.findById(id);
        if (!assignment) throw new Error('Assignment not found');
        return assignment;
    }

    static async deleteAssignment(id) {
        return await AssignmentModel.delete(id);
    }

    static async submitAssignment(data) {
        return await AssignmentModel.submit(data);
    }

    static async getSubmissions(assignmentId) {
        return await AssignmentModel.getSubmissions(assignmentId);
    }

    static async gradeSubmission(id, data) {
        return await AssignmentModel.gradeSubmission(id, data);
    }

    
    static async addQuestion(data) {
        return await AssignmentModel.addQuestion(data);
    }

    static async getQuestions(assignmentId) {
        return await AssignmentModel.getQuestions(assignmentId);
    }

    static async updateQuestion(id, data) {
        return await AssignmentModel.updateQuestion(id, data);
    }

    static async deleteQuestion(id) {
        return await AssignmentModel.deleteQuestion(id);
    }

    
    static async saveAnswer(data) {
        return await AssignmentModel.saveAnswer(data);
    }

    static async getAnswers(submissionId) {
        return await AssignmentModel.getAnswers(submissionId);
    }

    static async getMySubmission(studentId, assignmentId) {
        return await AssignmentModel.getSubmissionWithAnswers(assignmentId, studentId);
    }
}

module.exports = AssignmentService;
