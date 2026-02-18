/**
 * Authentication controller for handling HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema, sendOTPSchema, verifyOTPSchema } from '../validation/auth.validation';

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }

    // Get client info
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    // Register user
    const user = await authService.register(value, ipAddress, userAgent);

    res.status(201).json({
      success: true,
      data: {
        userId: user.userId,
        email: user.email,
        role: user.role
      }
    });
  } catch (error: any) {
    if (error.message === 'User with this email already exists') {
      res.status(409).json({
        error: {
          code: 'USER_EXISTS',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    next(error);
  }
};

/**
 * Login user
 * POST /api/v1/auth/login
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }

    // Get client info
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    // Login user
    const tokens = await authService.login(value, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    if (error.message.includes('Account temporarily locked')) {
      res.status(429).json({
        error: {
          code: 'ACCOUNT_LOCKED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    next(error);
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export const refresh = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }

    // Get client info
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    // Refresh token
    const tokens = await authService.refreshToken(value.refreshToken, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error: any) {
    if (error.message.includes('Invalid') || error.message.includes('expired')) {
      res.status(401).json({
        error: {
          code: 'INVALID_REFRESH_TOKEN',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    next(error);
  }
};

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get user ID from authenticated request
    const userId = (req as any).user?.userId;
    if (!userId) {
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

    // Get client info
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    // Logout user
    await authService.logout(userId, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send OTP for MFA
 * POST /api/v1/auth/send-otp
 */
export const sendOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = sendOTPSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }

    // Get client info
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    // Send OTP
    await authService.sendOTP(value.userId, ipAddress, userAgent);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully'
    });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    if (error.message === 'User does not have a phone number registered') {
      res.status(400).json({
        error: {
          code: 'PHONE_NOT_REGISTERED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    if (error.message === 'MFA is not enabled for this user') {
      res.status(400).json({
        error: {
          code: 'MFA_NOT_ENABLED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    next(error);
  }
};

/**
 * Verify OTP and complete login
 * POST /api/v1/auth/verify-otp
 */
export const verifyOTP = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body
    const { error, value } = verifyOTPSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.details.map(d => ({ field: d.path.join('.'), message: d.message })),
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }

    // Get client info
    const ipAddress = req.ip || req.socket.remoteAddress;
    const userAgent = req.get('user-agent');

    // Complete login with OTP
    const tokens = await authService.completeLoginWithOTP(
      value.userId,
      value.otp,
      ipAddress,
      userAgent
    );

    res.status(200).json({
      success: true,
      data: tokens
    });
  } catch (error: any) {
    if (error.message === 'Invalid OTP' || error.message === 'OTP expired or not found') {
      res.status(401).json({
        error: {
          code: 'INVALID_OTP',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    if (error.message === 'User not found') {
      res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id,
          path: req.path
        }
      });
      return;
    }
    next(error);
  }
};
