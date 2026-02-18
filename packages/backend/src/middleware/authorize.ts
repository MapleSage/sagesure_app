/**
 * Role-based access control (RBAC) middleware
 * Checks if authenticated user has required role permissions
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/auth';
import { logAuditTrail } from '../utils/auditLogger';

/**
 * Authorization middleware factory
 * Returns middleware that checks if user has one of the required roles
 * 
 * @param allowedRoles - Array of roles that are allowed to access the resource
 * @returns Express middleware function
 * 
 * @example
 * router.get('/admin-only', authenticate, authorize([UserRole.ADMIN]), handler);
 * router.get('/insurers', authenticate, authorize([UserRole.INSURER, UserRole.ADMIN]), handler);
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
            requestId: req.id,
            path: req.path
          }
        });
        return;
      }

      // Check if user has required role
      const userRole = req.user.role as UserRole;
      
      if (!allowedRoles.includes(userRole)) {
        // Log authorization failure
        await logAuditTrail({
          userId: req.user.userId,
          actionType: 'AUTHORIZATION_FAILED',
          outcome: 'FAILURE',
          resourceType: 'ENDPOINT',
          resourceId: req.path,
          details: {
            reason: 'Insufficient permissions',
            userRole,
            requiredRoles: allowedRoles
          },
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent')
        });

        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource',
            details: {
              userRole,
              requiredRoles: allowedRoles
            },
            timestamp: new Date().toISOString(),
            requestId: req.id,
            path: req.path
          }
        });
        return;
      }

      // User has required role, proceed
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has specific role
 * Utility function for use in controllers
 */
export const hasRole = (userRole: string, allowedRoles: UserRole[]): boolean => {
  return allowedRoles.includes(userRole as UserRole);
};

/**
 * Check if user is admin
 * Utility function for use in controllers
 */
export const isAdmin = (userRole: string): boolean => {
  return userRole === UserRole.ADMIN;
};

/**
 * Check if user is consumer
 * Utility function for use in controllers
 */
export const isConsumer = (userRole: string): boolean => {
  return userRole === UserRole.CONSUMER;
};

/**
 * Check if user is insurer
 * Utility function for use in controllers
 */
export const isInsurer = (userRole: string): boolean => {
  return userRole === UserRole.INSURER;
};

/**
 * Check if user is broker or agent
 * Utility function for use in controllers
 */
export const isIntermediary = (userRole: string): boolean => {
  return userRole === UserRole.BROKER || userRole === UserRole.AGENT;
};

/**
 * Check if user is regulator
 * Utility function for use in controllers
 */
export const isRegulator = (userRole: string): boolean => {
  return userRole === UserRole.REGULATOR;
};
