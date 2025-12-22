const AssignmentService = require('../services/AssignmentService');
const NotificationService = require('../services/NotificationService');
const pool = require('../db/pool');

class AssignmentController {
    static async create(req, res) {
        try {
            const { subject_id, title, description, instructions, due_date, max_score, total_points, resources, submission_type, status } = req.body;

            const finalDescription = description || instructions;
            const finalMaxScore = max_score || total_points;

            const assignment = await AssignmentService.createAssignment({
                teacher_id: req.user.id,
                subject_id,
                title,
                description: finalDescription,
                instructions: finalDescription,
                due_date,
                max_score: finalMaxScore,
                resources: JSON.stringify(resources || []),
                submission_type: submission_type || 'text',
                status: status || 'active'
            });



            try {
                await NotificationService.notifyClass({
                    subject_id,
                    title: 'New Assignment',
                    message: `New assignment posted: ${title}`,
                    type: 'assignment',
                    related_id: assignment.id,
                    exclude_user_id: req.user.id
                });
            } catch (notifyError) {
                console.error('Failed to send notifications:', notifyError);
            }

            res.status(201).json(assignment);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to create assignment' });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;


            if (req.user.role === 'teacher') {
                const assignment = await AssignmentService.getAssignment(id);
                if (String(assignment.teacher_id) !== String(req.user.id)) {
                    return res.status(403).json({ error: 'Unauthorized: not your assignment' });
                }
            }

            const { title, description, due_date, max_score, resources, submission_type, status } = req.body;

            const updated = await AssignmentService.updateAssignment(id, {
                title, description, due_date, max_score,
                resources: resources ? JSON.stringify(resources) : undefined,
                submission_type, status
            });
            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update assignment' });
        }
    }

    static async delete(req, res) {
        try {

            if (req.user.role === 'teacher') {
                const assignment = await AssignmentService.getAssignment(req.params.id);
                if (String(assignment.teacher_id) !== String(req.user.id)) {
                    return res.status(403).json({ error: 'Unauthorized: not your assignment' });
                }
            }

            await AssignmentService.deleteAssignment(req.params.id);
            res.json({ message: 'Assignment deleted' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete assignment' });
        }
    }

    static async getAll(req, res) {
        try {
            const { subjectId, status } = req.query;
            let assignments = [];

            if (subjectId) {
                assignments = await AssignmentService.getAssignmentsBySubject(subjectId);
            } else if (req.user.role === 'student') {
                assignments = await AssignmentService.getAssignmentsByStudent(req.user.id);
            } else if (req.user.role === 'teacher') {
                assignments = await AssignmentService.getAssignmentsByTeacher(req.user.id);
            }


            if (status) {
                assignments = assignments.filter(a => a.status === status);
            }

            return res.json(assignments);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch assignments' });
        }
    }

    static async getBySubject(req, res) {
        try {
            const assignments = await AssignmentService.getAssignmentsBySubject(req.params.subjectId);
            res.json(assignments);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch assignments' });
        }
    }

    static async submit(req, res) {
        try {

            if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can submit' });

            const { content, file_url, status } = req.body;
            const submission = await AssignmentService.submitAssignment({
                assignment_id: req.params.id,
                student_id: req.user.id,
                content,
                file_url,
                status: status || 'submitted'
            });
            res.json(submission);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to submit assignment' });
        }
    }

    static async getSubmissions(req, res) {
        try {

            const submissions = await AssignmentService.getSubmissions(req.params.id);
            res.json(submissions);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch submissions' });
        }
    }

    static async getMySubmission(req, res) {
        try {
            const submission = await AssignmentService.getMySubmission(req.user.id, req.params.id);
            if (!submission) {
                return res.status(404).json({ message: 'No submission found' });
            }
            res.json(submission);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch submission' });
        }
    }

    static async gradeSubmission(req, res) {
        try {

            const { score, feedback } = req.body;
            const graded = await AssignmentService.gradeSubmission(req.params.submissionId, { score, feedback });


            try {

                const submission = await pool.query('SELECT student_id, assignment_id FROM student_assignments WHERE id = $1', [req.params.submissionId]);
                if (submission.rows.length > 0) {
                    await NotificationService.createNotification({
                        user_id: submission.rows[0].student_id,
                        title: 'Assignment Graded',
                        message: `Your assignment has been graded. Score: ${score}`,
                        type: 'grade',
                        related_id: submission.rows[0].assignment_id
                    });
                }
            } catch (notifyError) {
                console.error('Failed to notify student of grade:', notifyError);
            }

            res.json(graded);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to grade submission' });
        }
    }


    static async addQuestion(req, res) {
        try {

            if (req.user.role === 'teacher') {
                const assignment = await AssignmentService.getAssignment(req.params.id);
                if (String(assignment.teacher_id) !== String(req.user.id)) {
                    return res.status(403).json({ error: 'Unauthorized: not your assignment' });
                }
            }

            const question = await AssignmentService.addQuestion({
                ...req.body,
                assignment_id: req.params.id
            });
            res.status(201).json(question);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: `Failed to add question: ${error.message}` });
        }
    }

    static async getQuestions(req, res) {
        try {
            const questions = await AssignmentService.getQuestions(req.params.id);
            res.json(questions);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to get questions' });
        }
    }

    static async updateQuestion(req, res) {
        try {
            const updated = await AssignmentService.updateQuestion(req.params.questionId, req.body);
            res.json(updated);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to update question' });
        }
    }

    static async deleteQuestion(req, res) {
        try {
            await AssignmentService.deleteQuestion(req.params.questionId);
            res.json({ message: 'Question deleted' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to delete question' });
        }
    }

    static async saveAnswer(req, res) {
        try {









            const { submission_id } = req.body;
            if (!submission_id) return res.status(400).json({ error: 'Submission ID required' });

            const answer = await AssignmentService.saveAnswer({
                assignment_submission_id: submission_id,
                ...req.body
            });
            res.json(answer);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to save answer' });
        }
    }
    static async getAnswers(req, res) {
        try {
            const answers = await AssignmentService.getAnswers(req.params.submissionId);
            res.json(answers);
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Failed to fetch answers' });
        }
    }
}

module.exports = AssignmentController;
