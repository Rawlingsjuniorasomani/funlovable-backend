const QuizService = require('../services/QuizService');

class QuizController {
  // Get all quizzes (with filters)
  static async getAll(req, res) {
    try {
      const filters = {};
      if (req.user.role === 'teacher') {
        filters.teacher_id = req.user.id;
      }
      const quizzes = await QuizService.getAllQuizzes(filters);
      res.json(quizzes);
    } catch (error) {
      console.error('Get all quizzes error:', error);
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ error: 'Failed to fetch quizzes', details: error?.message || String(error) });
      }
      res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
  }

  // Create quiz
  static async create(req, res) {
    try {
      const quizData = {
        teacher_id: req.user.id,
        ...req.body
      };

      const quiz = await QuizService.createQuiz(quizData);
      res.status(201).json(quiz);
    } catch (error) {
      console.error('Create quiz error:', error);
      res.status(500).json({ error: 'Failed to create quiz' });
    }
  }

  // Update quiz
  static async update(req, res) {
    try {
      const { id } = req.params;
      
      // Check ownership: teachers can only update their own quizzes
      if (req.user.role === 'teacher') {
        const quiz = await QuizService.getQuizById(id);
        if (String(quiz.teacher_id) !== String(req.user.id)) {
          return res.status(403).json({ error: 'Unauthorized: not your quiz' });
        }
      }

      const updatedQuiz = await QuizService.updateQuiz(id, req.body);

      if (!updatedQuiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      res.json(updatedQuiz);
    } catch (error) {
      console.error('Update quiz error:', error);
      res.status(500).json({ error: 'Failed to update quiz' });
    }
  }

  // Publish quiz
  static async publish(req, res) {
    try {
      const { id } = req.params;
      const quiz = await QuizService.publishQuiz(id);

      if (!quiz) {
        return res.status(404).json({ error: 'Quiz not found' });
      }

      res.json(quiz);
    } catch (error) {
      console.error('Publish quiz error:', error);
      res.status(500).json({ error: 'Failed to publish quiz' });
    }
  }

  // Get quiz by ID
  static async getOne(req, res) {
    try {
      const quiz = await QuizService.getQuizById(req.params.id);
      res.json(quiz);
    } catch (error) {
      if (error.message === 'Quiz not found') {
        return res.status(404).json({ error: error.message });
      }
      console.error('Get quiz error:', error);
      res.status(500).json({ error: 'Failed to fetch quiz' });
    }
  }

  // Get quizzes by subject
  static async getBySubject(req, res) {
    try {
      const quizzes = await QuizService.getQuizzesBySubject(req.params.subjectId);
      res.json(quizzes);
    } catch (error) {
      console.error('Get quizzes error:', error);
      res.status(500).json({ error: 'Failed to fetch quizzes' });
    }
  }

  // Get available quizzes for student
  static async getAvailable(req, res) {
    try {
      const quizzes = await QuizService.getAvailableQuizzes(req.user.id);
      res.json(quizzes);
    } catch (error) {
      console.error('Get available quizzes error:', error);
      res.status(500).json({ error: 'Failed to fetch available quizzes' });
    }
  }

  // Add question to quiz
  static async addQuestion(req, res) {
    try {
      const questionData = {
        quiz_id: req.params.id,
        ...req.body
      };

      const question = await QuizService.addQuestion(questionData);
      res.status(201).json(question);
    } catch (error) {
      console.error('Add question error:', error);
      res.status(500).json({ error: 'Failed to add question' });
    }
  }

  // Get quiz questions
  static async getQuestions(req, res) {
    try {
      const { id } = req.params;
      const { randomize } = req.query;

      const questions = await QuizService.getQuestions(id, randomize === 'true');

      // Security: Hide correct answers for students
      if (req.user.role === 'student') {
        const sanitizedQuestions = questions.map(q => {
          const { correct_answer, ...rest } = q;
          return rest;
        });
        return res.json(sanitizedQuestions);
      }

      res.json(questions);
    } catch (error) {
      console.error('Get questions error:', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }

  // Update question
  static async updateQuestion(req, res) {
    try {
      const { questionId } = req.params;
      const question = await QuizService.updateQuestion(questionId, req.body);

      if (!question) {
        return res.status(404).json({ error: 'Question not found' });
      }

      res.json(question);
    } catch (error) {
      console.error('Update question error:', error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }

  // Delete question
  static async deleteQuestion(req, res) {
    try {
      const { questionId } = req.params;
      await QuizService.deleteQuestion(questionId);
      res.json({ message: 'Question deleted successfully' });
    } catch (error) {
      console.error('Delete question error:', error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }

  // Start quiz attempt
  static async startAttempt(req, res) {
    try {
      const { id } = req.params;
      const attempt = await QuizService.startAttempt(id, req.user.id);
      res.status(201).json(attempt);
    } catch (error) {
      console.error('Start attempt error:', error);
      res.status(500).json({ error: 'Failed to start quiz attempt' });
    }
  }

  // Save answer
  static async saveAnswer(req, res) {
    try {
      const { attemptId } = req.params;
      const answerData = {
        attempt_id: attemptId,
        ...req.body
      };

      const answer = await QuizService.saveAnswer(answerData);
      res.json(answer);
    } catch (error) {
      console.error('Save answer error:', error);
      res.status(500).json({ error: 'Failed to save answer' });
    }
  }

  // Submit quiz
  static async submit(req, res) {
    try {
      const { attemptId } = req.params;
      const { time_taken_seconds } = req.body;

      const attempt = await QuizService.submitQuiz(attemptId, time_taken_seconds);
      res.json(attempt);
    } catch (error) {
      console.error('Submit quiz error:', error);
      res.status(500).json({ error: 'Failed to submit quiz' });
    }
  }

  // Get attempt results
  static async getAttemptResults(req, res) {
    try {
      const { attemptId } = req.params;

      const [attempt, answers] = await Promise.all([
        QuizService.getAttempt(attemptId),
        QuizService.getAnswers(attemptId)
      ]);

      if (!attempt) {
        return res.status(404).json({ error: 'Attempt not found' });
      }

      res.json({ attempt, answers });
    } catch (error) {
      console.error('Get attempt results error:', error);
      res.status(500).json({ error: 'Failed to fetch attempt results' });
    }
  }

  // Get quiz attempts (teacher)
  static async getAttempts(req, res) {
    try {
      const { id } = req.params;
      const attempts = await QuizService.getAttemptsByQuiz(id);
      res.json(attempts);
    } catch (error) {
      console.error('Get attempts error:', error);
      res.status(500).json({ error: 'Failed to fetch attempts' });
    }
  }

  // Grade answer (teacher)
  static async gradeAnswer(req, res) {
    try {
      const { answerId } = req.params;
      const { marks_awarded, feedback } = req.body;

      const answer = await QuizService.gradeAnswer(answerId, marks_awarded, feedback);
      res.json(answer);
    } catch (error) {
      console.error('Grade answer error:', error);
      res.status(500).json({ error: 'Failed to grade answer' });
    }
  }

  // Release results (teacher)
  static async releaseResults(req, res) {
    try {
      const { attemptId } = req.params;
      const attempt = await QuizService.releaseResults(attemptId);

      if (!attempt) {
        return res.status(404).json({ error: 'Attempt not found' });
      }

      res.json(attempt);
    } catch (error) {
      console.error('Release results error:', error);
      res.status(500).json({ error: 'Failed to release results' });
    }
  }

  // Update attempt feedback (teacher)
  static async updateFeedback(req, res) {
    try {
      const { attemptId } = req.params;
      const { feedback, manual_graded_score } = req.body;

      const attempt = await QuizService.updateFeedback(attemptId, feedback, manual_graded_score);
      res.json(attempt);
    } catch (error) {
      console.error('Update feedback error:', error);
      res.status(500).json({ error: 'Failed to update feedback' });
    }
  }
}

module.exports = QuizController;
