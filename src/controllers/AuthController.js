const AuthService = require('../services/AuthService');
const { validationResult } = require('express-validator');

class AuthController {
    static async register(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { name, email, password, role, phone, school, age, class: studentClass, ...rest } = req.body;

            if (role === 'parent' || role === 'student') {
                return res.status(403).json({
                    error: 'Payment required before account creation',
                    code: 'PAYMENT_REQUIRED'
                });
            }
            
            
            const result = await AuthService.register({ name, email, password, role, phone, school, age, studentClass, ...rest });

            
            try {
                const pool = require('../db/pool');
                const NotificationModel = require('../models/NotificationModel');

                const adminResult = await pool.query("SELECT id FROM users WHERE role = 'admin'");
                const admins = adminResult.rows;

                const notificationPromises = admins.map(admin =>
                    NotificationModel.create({
                        user_id: admin.id,
                        type: 'info',
                        title: 'New User Registration',
                        message: `${role.charAt(0).toUpperCase() + role.slice(1)} ${name} has joined the platform.`,
                        data: { userId: result.user.id, role }
                    })
                );

                await Promise.all(notificationPromises);
            } catch (notifError) {
                console.error('Failed to notify admins:', notifError);
                
            }

            if (result.token) {
                res.cookie('token', result.token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 24 * 60 * 60 * 1000 
                });
            }

            res.status(201).json(result);
        } catch (error) {
            if (error.message === 'Email already registered') {
                return res.status(400).json({ error: error.message });
            }
            console.error(error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }

    static async login(req, res) {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ errors: errors.array() });
            }

            const { email, phone, password } = req.body;
            
            const identifier = email || phone;
            if (!identifier) {
                return res.status(400).json({ error: 'Email or Phone is required' });
            }
            const result = await AuthService.login(identifier, password);

            
            res.cookie('token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 24 * 60 * 60 * 1000 
            });

            res.json(result);
        } catch (error) {
            if (error.message === 'Invalid credentials' || error.message.includes('pending admin approval') || error.message.includes('Registration incomplete')) {
                return res.status(401).json({ error: error.message });
            }
            console.error(error);
            res.status(500).json({ error: 'Login failed' });
        }
    }

    static async logout(req, res) {
        try {
            res.clearCookie('token', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            });
            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({ error: 'Logout failed' });
        }
    }

    static async adminLogin(req, res) {
        try {
            const { email, password } = req.body;
            const result = await AuthService.adminLogin(email, password);

            
            res.cookie('token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 24 * 60 * 60 * 1000 
            });

            res.json(result);
        } catch (error) {
            if (error.message === 'Invalid admin credentials') {
                return res.status(401).json({ error: error.message });
            }
            console.error(error);
            res.status(500).json({ error: 'Admin login failed' });
        }
    }

    static async getMe(req, res) {
        try {
            
            let user = req.user;

            
            if (user && user.role === 'parent') {
                try {
                    const pool = require('../db/pool');
                    const childrenResult = await pool.query(`
                        SELECT u.id, u.name, u.email, u.avatar, u.student_class as grade, u.age
                        FROM users u
                        INNER JOIN parent_children pc ON u.id = pc.child_id
                        WHERE pc.parent_id = $1
                    `, [user.id]);

                    user = { ...user, children: childrenResult.rows };
                } catch (childErr) {
                    console.error('Failed to fetch parent children for getMe:', childErr);
                    
                }
            }

            res.json({ user });
        } catch (error) {
            console.error('Get me error:', error);
            res.status(500).json({ error: 'Failed to get user' });
        }
    }

    static async completeOnboarding(req, res) {
        try {
            const result = await AuthService.completeOnboarding(req.user.id);
            res.json(result);
        } catch (error) {
            console.error('Complete onboarding error:', error);
            res.status(500).json({ error: 'Failed to complete onboarding' });
        }
    }

    static async generateOTP(req, res) {
        try {
            const OtpService = require('../services/OtpService');
            
            if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

            const code = await OtpService.generateOTP(req.user.id, req.body.type || 'general');

            
            if (process.env.NODE_ENV === 'development') {
                return res.json({ message: 'OTP generated', code });
            }

            res.json({ message: 'OTP generated' });
        } catch (error) {
            console.error('Generate OTP error:', error);
            res.status(500).json({ error: 'Failed to generate OTP' });
        }
    }
    static async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ error: 'Email is required' });

            const result = await AuthService.requestPasswordReset(email);
            res.json(result);
        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(400).json({ error: error.message || 'Request failed' });
        }
    }

    static async resetPassword(req, res) {
        try {
            const { email, otp, newPassword } = req.body;
            if (!email || !otp || !newPassword) {
                return res.status(400).json({ error: 'All fields are required' });
            }

            const result = await AuthService.resetPassword(email, otp, newPassword);
            res.json(result);
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(400).json({ error: error.message });
        }
    }
}

module.exports = AuthController;
