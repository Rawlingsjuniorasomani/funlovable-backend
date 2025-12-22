const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controllers/AuthController');
const { authMiddleware } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

const router = express.Router();


router.post('/register', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['student', 'teacher', 'parent']).withMessage('Invalid role')
], AuthController.register);


router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], AuthController.login);


router.post('/admin/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], AuthController.adminLogin);


router.post('/logout', AuthController.logout);


router.get('/me', authMiddleware, AuthController.getMe);


router.post('/onboarding/complete', authMiddleware, AuthController.completeOnboarding);


router.post('/generate-otp', authMiddleware, rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), AuthController.generateOTP);


router.post('/forgot-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), AuthController.forgotPassword);


router.post('/reset-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 }), [
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], AuthController.resetPassword);

module.exports = router;
