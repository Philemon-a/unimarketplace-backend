import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';
import listingsRoutes from './listingsRoutes';
import userRoutes from './userRoutes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

// User routes
router.use('/user', userRoutes);

// Listings routes
router.use('/listings', listingsRoutes);

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
            user: '/api/user',
            listings: '/api/listings',
        },
    });
});

export default router;
