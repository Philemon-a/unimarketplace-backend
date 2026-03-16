import { Router } from 'express';
import { updateProfile } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/user/update-profile
 * Update the authenticated user's profile
 * Requires authentication
 */
router.post('/update-profile', authenticate, updateProfile);

export default router;
