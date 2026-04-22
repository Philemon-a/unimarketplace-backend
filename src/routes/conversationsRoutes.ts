import { Router } from 'express';
import {
    getConversations,
    getOrCreateConversation,
    getConversationById,
    sendMessage,
    markConversationRead,
} from '../controllers/conversationsController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getConversations);
router.post('/', authenticate, getOrCreateConversation);
router.get('/:id', authenticate, getConversationById);
router.post('/:id/messages', authenticate, sendMessage);
router.put('/:id/read', authenticate, markConversationRead);

export default router;
