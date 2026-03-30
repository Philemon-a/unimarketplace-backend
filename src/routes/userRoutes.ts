import { Router } from 'express';
import { updateProfile, deleteAccount } from '../controllers/userController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/update-profile', authenticate, updateProfile);
router.delete('/delete-account', authenticate, deleteAccount);

export default router;
