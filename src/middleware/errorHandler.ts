import { Request, Response, NextFunction } from 'express';

interface ErrorResponse {
    status: string;
    message: string;
    stack?: string;
}

export const notFoundHandler = (
    req: Request,
    res: Response,
    _next: NextFunction
): void => {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.originalUrl} not found`,
    });
}; 

export const errorHandler = (
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    const response: ErrorResponse = {
        status: 'error',
        message: err.message || 'Internal Server Error',
    };

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};
