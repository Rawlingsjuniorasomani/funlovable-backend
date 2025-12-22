const QuizModel = require('../models/QuizModel');

class QuizService {
    static async getAllQuizzes(filters) {
        return await QuizModel.getAllQuizzes(filters);
    }

    static async createQuiz(data) {
        return await QuizModel.create(data);
    }

    static async updateQuiz(id, data) {
        return await QuizModel.update(id, data);
    }

    static async publishQuiz(id) {
        return await QuizModel.publish(id);
    }

    static async getQuizById(id) {
        const quiz = await QuizModel.getById(id);
        if (!quiz) throw new Error('Quiz not found');
        return quiz;
    }

    static async getQuizzesBySubject(subjectId) {
        return await QuizModel.getBySubject(subjectId);
    }

    static async getAvailableQuizzes(studentId) {
        return await QuizModel.getAvailable(studentId);
    }

    
    static async addQuestion(data) {
        return await QuizModel.addQuestion(data);
    }

    static async getQuestions(quizId, randomize = false) {
        return await QuizModel.getQuestions(quizId, randomize);
    }

    static async updateQuestion(id, data) {
        return await QuizModel.updateQuestion(id, data);
    }

    static async deleteQuestion(id) {
        return await QuizModel.deleteQuestion(id);
    }

    
    static async startAttempt(quizId, studentId) {
        return await QuizModel.startAttempt(quizId, studentId);
    }

    static async getAttempt(attemptId) {
        return await QuizModel.getAttempt(attemptId);
    }

    static async getAttemptsByQuiz(quizId) {
        return await QuizModel.getAttemptsByQuiz(quizId);
    }

    
    static async saveAnswer(data) {
        return await QuizModel.saveAnswer(data);
    }

    static async getAnswers(attemptId) {
        return await QuizModel.getAnswers(attemptId);
    }

    static async gradeAnswer(answerId, marksAwarded, feedback) {
        return await QuizModel.gradeAnswer(answerId, marksAwarded, feedback);
    }

    
    static async submitQuiz(attemptId, timeTaken) {
        return await QuizModel.submitAttempt(attemptId, timeTaken);
    }

    static async releaseResults(attemptId) {
        return await QuizModel.releaseResults(attemptId);
    }

    static async updateFeedback(attemptId, feedback, manualScore) {
        return await QuizModel.updateAttemptFeedback(attemptId, feedback, manualScore);
    }
}

module.exports = QuizService;
