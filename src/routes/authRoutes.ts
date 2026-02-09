import { Router } from 'express';
import {
    handleOAuthCallback,
    getCurrentUser,
    signOut,
} from '../controllers/authController';
import { authenticate, validateEduEmail } from '../middleware/authMiddleware';

const router = Router();

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
 * POST /api/auth/signout
 * Sign out current user
 */
router.post('/signout', signOut);

export default router;
