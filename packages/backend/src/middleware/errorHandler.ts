import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    requestId: string;
    path: string;
  };
}

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.requestId || 'unknown';
  
  // Default error values
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown = undefined;

  // Handle known AppError instances
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  }

  // Log error with stack trace (Requirement 28.3, 28.4)
  logger.error('Request error', {
    requestId,
    path: req.path,
    method: req.method,
    statusCode,
    code,
    message,
    stack: err.stack,
    userId: (req as any).user?.userId,
    ip: req.ip,
  });

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      code,
      message,
      details: process.env.NODE_ENV === 'development' ? details : undefined,
      timestamp: new Date().toISOString(),
      requestId,
      path: req.path,
    },
  };

  res.status(statusCode).json(errorResponse);
};
