import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { isEduEmail } from '../utils/emailValidator';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                name?: string;
            };
        }
    }
}

/**
 * Middleware to verify JWT token and authenticate user
 */
export const authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        // Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                status: 'error',
                message: 'No authentication token provided',
            });
            return;
        }

        const token = authHeader.replace('Bearer ', '');

        // Verify token with Supabase
        const { data: { user }, error } = await supabase.auth.getUser(token);

        if (error || !user) {
            res.status(401).json({
                status: 'error',
                message: 'Invalid or expired token',
            });
            return;
        }

        // Attach user to request
        req.user = {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name,
        };

        next();
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Authentication error',
        });
    }
};

/**
 * Middleware to validate that user has .edu email
 */
export const validateEduEmail = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user || !req.user.email) {
            res.status(401).json({
                status: 'error',
                message: 'User not authenticated',
            });
            return;
        }

        // Check if email is .edu
        if (!isEduEmail(req.user.email)) {
            res.status(403).json({
                status: 'error',
                message: 'Only university .edu email addresses are allowed',
            });
            return;
        }

        next();
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Email validation error',
        });
    }
};
