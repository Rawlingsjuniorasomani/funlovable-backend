const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware, requireRole } = require('../middleware/auth');

const router = express.Router();
const settingsPath = path.resolve(__dirname, '../../settings.json');


router.get('/', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            res.json(settings);
        } else {
            res.json({}); 
        }
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'Failed to get settings' });
    }
});


router.post('/', authMiddleware, requireRole('admin'), (req, res) => {
    try {
        const settings = req.body;
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        res.json({ message: 'Settings saved successfully', settings });
    } catch (error) {
        console.error('Save settings error:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

module.exports = router;
