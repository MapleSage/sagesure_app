/**
 * JWT authentication middleware
 * Verifies JWT tokens and attaches user context to requests
 */

import { Request, Response, NextFunction } from 'express';
import { validateToken } from '../services/auth.service';
import { logAuditTrail } from '../utils/auditLogger';

/**
 * Extend Express Request type to include user context
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
      };
      id?: string;
    }
  }
}

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
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
      await logAuditTrail({
        actionType: 'AUTHENTICATION_FAILED',
        outcome: 'FAILURE',
        details: { reason: 'Missing or invalid Authorization header' },
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent')
      });

      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please provide a valid Bearer token.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate token
    const payload = validateToken(token);

    // Attach user context to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role
    };

    next();
  } catch (error: any) {
    await logAuditTrail({
      actionType: 'AUTHENTICATION_FAILED',
      outcome: 'FAILURE',
      details: { reason: error.message },
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent')
    });

    if (error.message === 'Token expired') {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired. Please refresh your token.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }

    if (error.message === 'Invalid token') {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token. Please login again.',
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed',
        timestamp: new Date().toISOString(),
        requestId: req.id,
        path: req.path
      }
    });
  }
};
