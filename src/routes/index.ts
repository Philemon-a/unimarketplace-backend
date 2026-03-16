import { Router, Request, Response } from 'express';
import authRoutes from './authRoutes';
import listingsRoutes from './listingsRoutes';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

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
            listings: '/api/listings',
        },
    });
});

export default router;
