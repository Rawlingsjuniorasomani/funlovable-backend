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
            // Map 'class' from frontend to 'studentClass' for backend consistency, or just pass 'class' if service handles it. 
            // Better to pass explicit fields.
            const result = await AuthService.register({ name, email, password, role, phone, school, age, studentClass, ...rest });

            // Notify Admins
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
                // Don't fail the registration if notification fails
            }

            // Notify Admins (existing code...)
            try {
                // ... (omitted for brevity in replacement, but I must be careful not to delete logic I can't see fully if I replace too much)
                // Wait, I should not replace the notification block. I'll target the lines AFTER notification block.
                // The view_file showed notification block ends at line 39. Line 41 is res.status(201).json(result);
            } catch (ignore) { }

            if (result.token) {
                res.cookie('token', result.token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                    maxAge: 24 * 60 * 60 * 1000 // 1 day
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

            const { email, password } = req.body;
            const result = await AuthService.login(email, password);

            // Set HTTP-only cookie
            res.cookie('token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
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

    static async adminLogin(req, res) {
        try {
            const { email, password } = req.body;
            const result = await AuthService.adminLogin(email, password);

            // Set HTTP-only cookie
            res.cookie('token', result.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 1 day
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
            // Return user in the same format as login
            let user = req.user;

            // If the user is a parent, fetch their children to include in the response
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
                    // proceed without children
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
            // User must be authenticated
            if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

            const code = await OtpService.generateOTP(req.user.id, req.body.type || 'general');

            // In production we should never return the code. Expose it only in development.
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
