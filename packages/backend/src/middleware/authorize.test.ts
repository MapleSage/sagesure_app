/**
 * Unit tests for RBAC authorization middleware
 */

import { Request, Response, NextFunction } from 'express';
import { authorize, hasRole, isAdmin, isConsumer, isInsurer, isIntermediary, isRegulator } from './authorize';
import { UserRole } from '../types/auth';

describe('Authorization Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;

  beforeEach(() => {
    mockRequest = {
      user: undefined,
      id: 'test-request-id',
      path: '/test-path',
      ip: '127.0.0.1',
      get: jest.fn()
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    nextFunction = jest.fn();
  });

  describe('authorize middleware', () => {
    it('should allow access for users with correct role', async () => {
      mockRequest.user = {
        userId: 'test-user',
        email: 'test@example.com',
        role: UserRole.ADMIN
      };

      const middleware = authorize([UserRole.ADMIN]);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should allow access for users with one of multiple allowed roles', async () => {
      mockRequest.user = {
        userId: 'test-user',
        email: 'test@example.com',
        role: UserRole.BROKER
      };

      const middleware = authorize([UserRole.BROKER, UserRole.AGENT, UserRole.ADMIN]);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for users without correct role', async () => {
      mockRequest.user = {
        userId: 'test-user',
        email: 'test@example.com',
        role: UserRole.CONSUMER
      };

      const middleware = authorize([UserRole.ADMIN]);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'FORBIDDEN',
            message: 'You do not have permission to access this resource'
          })
        })
      );
    });

    it('should deny access for unauthenticated users', async () => {
      mockRequest.user = undefined;

      const middleware = authorize([UserRole.ADMIN]);
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          })
        })
      );
    });

    it('should test all user roles', async () => {
      const roles = [
        UserRole.CONSUMER,
        UserRole.BROKER,
        UserRole.AGENT,
        UserRole.INSURER,
        UserRole.REGULATOR,
        UserRole.ADMIN
      ];

      for (const role of roles) {
        mockRequest.user = {
          userId: 'test-user',
          email: 'test@example.com',
          role
        };

        const middleware = authorize([role]);
        await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        jest.clearAllMocks();
      }
    });
  });

  describe('hasRole utility', () => {
    it('should return true for matching role', () => {
      expect(hasRole(UserRole.ADMIN, [UserRole.ADMIN])).toBe(true);
      expect(hasRole(UserRole.CONSUMER, [UserRole.CONSUMER, UserRole.BROKER])).toBe(true);
    });

    it('should return false for non-matching role', () => {
      expect(hasRole(UserRole.CONSUMER, [UserRole.ADMIN])).toBe(false);
      expect(hasRole(UserRole.BROKER, [UserRole.INSURER, UserRole.REGULATOR])).toBe(false);
    });
  });

  describe('isAdmin utility', () => {
    it('should return true for admin role', () => {
      expect(isAdmin(UserRole.ADMIN)).toBe(true);
    });

    it('should return false for non-admin roles', () => {
      expect(isAdmin(UserRole.CONSUMER)).toBe(false);
      expect(isAdmin(UserRole.BROKER)).toBe(false);
      expect(isAdmin(UserRole.AGENT)).toBe(false);
      expect(isAdmin(UserRole.INSURER)).toBe(false);
      expect(isAdmin(UserRole.REGULATOR)).toBe(false);
    });
  });

  describe('isConsumer utility', () => {
    it('should return true for consumer role', () => {
      expect(isConsumer(UserRole.CONSUMER)).toBe(true);
    });

    it('should return false for non-consumer roles', () => {
      expect(isConsumer(UserRole.ADMIN)).toBe(false);
      expect(isConsumer(UserRole.BROKER)).toBe(false);
    });
  });

  describe('isInsurer utility', () => {
    it('should return true for insurer role', () => {
      expect(isInsurer(UserRole.INSURER)).toBe(true);
    });

    it('should return false for non-insurer roles', () => {
      expect(isInsurer(UserRole.CONSUMER)).toBe(false);
      expect(isInsurer(UserRole.ADMIN)).toBe(false);
    });
  });

  describe('isIntermediary utility', () => {
    it('should return true for broker and agent roles', () => {
      expect(isIntermediary(UserRole.BROKER)).toBe(true);
      expect(isIntermediary(UserRole.AGENT)).toBe(true);
    });

    it('should return false for non-intermediary roles', () => {
      expect(isIntermediary(UserRole.CONSUMER)).toBe(false);
      expect(isIntermediary(UserRole.INSURER)).toBe(false);
      expect(isIntermediary(UserRole.ADMIN)).toBe(false);
    });
  });

  describe('isRegulator utility', () => {
    it('should return true for regulator role', () => {
      expect(isRegulator(UserRole.REGULATOR)).toBe(true);
    });

    it('should return false for non-regulator roles', () => {
      expect(isRegulator(UserRole.CONSUMER)).toBe(false);
      expect(isRegulator(UserRole.ADMIN)).toBe(false);
    });
  });
});
