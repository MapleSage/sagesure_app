/**
 * Authentication routes
 */

import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { authenticate } from '../middleware/authenticate';

const router = Router();

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login user and get JWT tokens
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post('/refresh', authController.refresh);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private
 */
router.post('/logout', authenticate, authController.logout);

/**
 * @route   POST /api/v1/auth/send-otp
 * @desc    Send OTP for multi-factor authentication
 * @access  Public
 */
router.post('/send-otp', authController.sendOTP);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP and complete login
 * @access  Public
 */
router.post('/verify-otp', authController.verifyOTP);

export default router;
