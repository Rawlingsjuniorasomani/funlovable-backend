const RewardModel = require('../models/RewardModel');
const NotificationModel = require('../models/NotificationModel');

class RewardController {
    static async create(req, res) {
        try {
            const { student_id, type, name, reason } = req.body;

            if (!student_id || !type || !name || !reason) {
                return res.status(400).json({ error: 'Missing required fields' });
            }

            const reward = await RewardModel.create({
                student_id,
                teacher_id: req.user.id,
                type,
                name,
                reason
            });

            
            await NotificationModel.create({
                type: 'success',
                title: 'You received a reward!',
                description: `You were awarded "${name}" by your teacher.`,
                related_id: reward.id,
                user_id: student_id 
            });

            

            res.status(201).json(reward);
        } catch (error) {
            console.error('Create reward error:', error);
            res.status(500).json({ error: 'Failed to create reward' });
        }
    }

    static async getMyRewards(req, res) {
        try {
            
            if (req.user.role === 'teacher') {
                const rewards = await RewardModel.getByTeacher(req.user.id);
                res.json(rewards);
            } else if (req.user.role === 'student') {
                const rewards = await RewardModel.getByStudent(req.user.id);
                res.json(rewards);
            } else {
                res.status(403).json({ error: 'Unauthorized' });
            }
        } catch (error) {
            console.error('Get rewards error:', error);
            res.status(500).json({ error: 'Failed to fetch rewards' });
        }
    }

    static async delete(req, res) {
        try {
            
            
            await RewardModel.delete(req.params.id);
            res.json({ message: 'Reward deleted' });
        } catch (error) {
            console.error('Delete reward error:', error);
            res.status(500).json({ error: 'Failed to delete reward' });
        }
    }
}

module.exports = RewardController;
