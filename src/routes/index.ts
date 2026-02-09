import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// Welcome endpoint
router.get('/', (_req: Request, res: Response) => {
    res.json({
        status: 'success',
        message: 'Welcome to University Marketplace API',
        version: '1.0.0',
        endpoints: {
            health: '/health',
            api: '/api',
            auth: '/api/auth',
        },
    });
});

// Example routes - you can expand these
router.get('/items', (_req: Request, res: Response) => {
    res.json({
        status: 'success',
        message: 'Get all marketplace items',
        data: [],
    });
});

export default router;
