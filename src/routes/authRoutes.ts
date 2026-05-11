import { Router } from 'express';
import {
    signUp,
    signIn,
    handleOAuthCallback,
    getCurrentUser,
    signOut,
    requestOtp,
    verifyOtp,
    forgotPassword,
    resetPassword,
} from '../controllers/authController';
import { authenticate, validateEduEmail } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new user with email and password
 */
router.post('/signup', signUp);

/**
 * POST /api/auth/signin
 * Sign in with email and password
 */
router.post('/signin', signIn);

/**
 * GET /api/auth/me
 * Get current authenticated user profile
 * Requires authentication
 */
router.get('/me', authenticate, getCurrentUser);

/**
 * POST /api/auth/callback
 * Handle OAuth callback and validate .edu email
 */
router.post('/callback', handleOAuthCallback);

/**
 * GET /api/auth/session
 * Get current authenticated user
 * Requires authentication
 */
router.get('/session', authenticate, validateEduEmail, getCurrentUser);

/**
 * POST /api/auth/request-otp
 * Send a one-time verification code to a .edu email
 */
router.post('/request-otp', requestOtp);

/**
 * POST /api/auth/verify-otp
 * Verify the one-time code and return a session
 */
router.post('/verify-otp', verifyOtp);

/**
 * POST /api/auth/forgot-password
 * Send a password reset email
 */
router.post('/forgot-password', forgotPassword);

/**
 * POST /api/auth/reset-password
 * Verify recovery OTP and update password
 */
router.post('/reset-password', resetPassword);

/**
 * POST /api/auth/signout
 * Sign out current user
 */
router.post('/signout', signOut);

export default router;
