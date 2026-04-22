import { Router } from 'express';
import { getPublicProfile, updateProfile, deleteAccount } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/profile/:id', authenticate, getPublicProfile);
router.post('/update-profile', authenticate, updateProfile);
router.delete('/delete-account', authenticate, deleteAccount);

export default router;
