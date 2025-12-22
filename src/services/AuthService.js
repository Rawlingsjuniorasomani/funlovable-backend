const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const ProfileModel = require('../models/ProfileModel');
const pool = require('../db/pool');
const NotificationModel = require('../models/NotificationModel');
const SubscriptionModel = require('../models/SubscriptionModel');
const ParentService = require('./ParentService');
const SmsService = require('./SmsService');

class AuthService {
    static async register({ name, email, password, role, phone, school, age, studentClass, ...rest }) {
        if (email) {
            const existingUserEmail = await UserModel.findByEmail(email);
            if (existingUserEmail) {
                throw new Error('Email already registered');
            }
        }

        if (phone) {
            const existingUserPhone = await UserModel.findByPhone(phone);
            if (existingUserPhone) {
                throw new Error('Phone number already registered');
            }
        }

        const passwordHash = await bcrypt.hash(password, 10);
        
        const isApproved = role !== 'teacher';

        
        const user = await UserModel.create({ name, email, passwordHash, role, phone, isApproved, school, age, studentClass });

        
        if (role === 'parent') {
            await ProfileModel.createParent(user.id);
        } else if (role === 'teacher') {
            const { bio, qualifications, address, subjectId } = rest;
          
            
            const { yearsOfExperience } = rest;
            await ProfileModel.createTeacher(user.id, bio || '', qualifications || '', school, yearsOfExperience, address, subjectId);
        }

        
        if (role === 'teacher') {
            delete user.password_hash;
            return {
                user,
                message: 'Registration successful! Your account is pending admin approval. You will be notified once approved.',
                requiresApproval: true
            };
        }

        const token = this.generateToken(user);
        return { user, token };
    }

    static async login(identifier, password) {
        const user = await UserModel.findByIdentifier(identifier);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            throw new Error('Invalid credentials');
        }

        
        if (user.role === 'teacher' && !user.is_approved) {
            throw new Error('Your account is pending admin approval. Please wait for an administrator to review your application.');
        }

        if (user.role === 'parent') {
            
            const childCheck = await pool.query(
                'SELECT 1 FROM parent_children WHERE parent_id = $1 LIMIT 1',
                [user.id]
            );

            if (childCheck.rows.length === 0) {
                throw new Error('Registration incomplete: No children added.');
            }

            
            
            
            
            

            
            
            
            
        }

        const token = this.generateToken(user);
        delete user.password_hash; 

        
        if (user.role === 'parent') {
            const subscription = await SubscriptionModel.findByParent(user.id);
            if (subscription) {
                user.subscription = {
                    plan: subscription.plan,
                    status: subscription.status,
                    expiresAt: subscription.expires_at
                };
            }

            try {
                const children = await ParentService.getChildren(user.id);
                user.children = children;
            } catch (error) {
                console.error('Failed to attach children to user:', error);
                user.children = [];
            }
        }

        return { user, token };
    }

    static async adminLogin(email, password) {
        console.log('Admin login attempt for:', email);

        
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND role = $2',
            [email, 'admin']
        );

        console.log('Found users:', result.rows.length);

        if (result.rows.length === 0) {
            console.log('No admin found with email:', email);
            throw new Error('Invalid admin credentials');
        }

        const user = result.rows[0];
        console.log('Checking password for user:', user.id);

        const isValid = await bcrypt.compare(password, user.password_hash);
        console.log('Password valid:', isValid);

        if (!isValid) {
            throw new Error('Invalid admin credentials');
        }

        const token = this.generateToken(user);
        delete user.password_hash;

        console.log('Admin login successful, returning token');
        return { user, token };
    }

    static async completeOnboarding(userId) {
        const result = await pool.query(
            'UPDATE users SET is_onboarded = true WHERE id = $1 RETURNING id, is_onboarded',
            [userId]
        );
        return result.rows[0];
    }

    static generateToken(user) {
        return jwt.sign(
            { userId: user.id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );
    }
    static async requestPasswordReset(email) {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            
            return { message: 'If an account exists, an OTP has been sent.' };
        }

        const OtpService = require('./OtpService');
        const code = await OtpService.generateOTP(user.id, 'password_reset');

        if (!user.phone) {
            
            throw new Error('No phone number found on this account');
        }

        try {
            await SmsService.sendSMS({
                recipients: user.phone,
                message: `Your password reset code is ${code}. It expires in 10 minutes.`
            });
        } catch (err) {
            console.error('Failed to send reset OTP via SMS:', err?.response?.data || err?.message || err);
            if (process.env.NODE_ENV !== 'development') {
                throw new Error('Failed to send OTP');
            }
        }

        if (process.env.NODE_ENV === 'development') {
            return { message: 'OTP sent to your phone.', devCode: code };
        }

        return { message: 'OTP sent to your phone.' };
    }

    static async resetPassword(email, otp, newPassword) {
        const user = await UserModel.findByEmail(email);
        if (!user) {
            throw new Error('Invalid request');
        }

        const OtpService = require('./OtpService');
        const isValid = await OtpService.verifyOTP(user.id, otp, 'password_reset');

        if (!isValid) {
            throw new Error('Invalid or expired OTP');
        }

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, user.id]);

        return { message: 'Password reset successfully. You can now login.' };
    }
}

module.exports = AuthService;
