/**
 * Authentication service for user registration, login, and token management
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { AuthTokens, TokenPayload, RegisterRequest, LoginRequest } from '../types/auth';
import { logAuditTrail } from '../utils/auditLogger';

const prisma = new PrismaClient();

// Constants
const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '30d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// JWT keys - in production, these should be loaded from Azure Key Vault
const JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || '';
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || '';

// Redis client for storing refresh tokens and tracking login attempts
// In production, this should use Azure Cache for Redis
let redisClient: any = null;

// OTP configuration
const OTP_EXPIRY_SECONDS = 5 * 60; // 5 minutes

/**
 * Initialize Redis client
 */
export const initializeRedis = (client: any) => {
  redisClient = client;
};

/**
 * Register a new user
 */
export const register = async (
  data: RegisterRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<{ userId: string; email: string; role: string }> => {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      await logAuditTrail({
        actionType: 'USER_REGISTRATION_FAILED',
        outcome: 'FAILURE',
        details: { reason: 'Email already exists', email: data.email },
        ipAddress,
        userAgent
      });
      throw new Error('User with this email already exists');
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        role: data.role,
        name: data.name,
        phone: data.phone
      }
    });

    // Log successful registration
    await logAuditTrail({
      userId: user.id,
      actionType: 'USER_REGISTRATION',
      outcome: 'SUCCESS',
      details: { email: user.email, role: user.role },
      ipAddress,
      userAgent
    });

    return {
      userId: user.id,
      email: user.email,
      role: user.role
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Login user and generate JWT tokens
 */
export const login = async (
  data: LoginRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthTokens> => {
  try {
    // Check login attempts (rate limiting)
    if (redisClient) {
      const attemptKey = `login_attempts:${data.email}`;
      const attempts = await redisClient.get(attemptKey);
      
      if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
        await logAuditTrail({
          actionType: 'USER_LOGIN_FAILED',
          outcome: 'FAILURE',
          details: { reason: 'Account locked due to too many failed attempts', email: data.email },
          ipAddress,
          userAgent
        });
        throw new Error('Account temporarily locked due to too many failed login attempts. Please try again in 15 minutes.');
      }
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      await trackFailedLogin(data.email, ipAddress, userAgent, 'User not found');
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

    if (!isPasswordValid) {
      await trackFailedLogin(data.email, ipAddress, userAgent, 'Invalid password');
      throw new Error('Invalid email or password');
    }

    // Reset login attempts on successful password verification
    if (redisClient) {
      await redisClient.del(`login_attempts:${data.email}`);
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // Send OTP
      await sendOTP(user.id, ipAddress, userAgent);

      // Return response indicating MFA is required
      return {
        accessToken: '',
        refreshToken: '',
        mfaRequired: true,
        userId: user.id
      };
    }

    // Generate tokens (MFA not enabled)
    const tokens = await generateTokens(user.id, user.email, user.role);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Log successful login
    await logAuditTrail({
      userId: user.id,
      actionType: 'USER_LOGIN',
      outcome: 'SUCCESS',
      details: { email: user.email },
      ipAddress,
      userAgent
    });

    return tokens;
  } catch (error) {
    throw error;
  }
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (
  refreshTokenString: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthTokens> => {
  try {
    // Verify refresh token
    const decoded = jwt.verify(refreshTokenString, JWT_PUBLIC_KEY, {
      algorithms: ['RS256']
    }) as TokenPayload;

    // Check if refresh token exists in Redis
    if (redisClient) {
      const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
      const storedToken = await redisClient.get(`refresh_token:${decoded.userId}`);
      
      if (!storedToken || storedToken !== tokenHash) {
        await logAuditTrail({
          userId: decoded.userId,
          actionType: 'TOKEN_REFRESH_FAILED',
          outcome: 'FAILURE',
          details: { reason: 'Invalid refresh token' },
          ipAddress,
          userAgent
        });
        throw new Error('Invalid refresh token');
      }
    }

    // Check if refresh token exists in database
    const tokenHash = crypto.createHash('sha256').update(refreshTokenString).digest('hex');
    const dbToken = await prisma.refreshToken.findFirst({
      where: {
        userId: decoded.userId,
        tokenHash,
        expiresAt: { gte: new Date() }
      }
    });

    if (!dbToken) {
      await logAuditTrail({
        userId: decoded.userId,
        actionType: 'TOKEN_REFRESH_FAILED',
        outcome: 'FAILURE',
        details: { reason: 'Refresh token not found or expired' },
        ipAddress,
        userAgent
      });
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new tokens
    const tokens = await generateTokens(decoded.userId, decoded.email, decoded.role);

    // Log successful token refresh
    await logAuditTrail({
      userId: decoded.userId,
      actionType: 'TOKEN_REFRESH',
      outcome: 'SUCCESS',
      ipAddress,
      userAgent
    });

    return tokens;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
};

/**
 * Logout user by invalidating refresh token
 */
export const logout = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    // Delete refresh token from Redis
    if (redisClient) {
      await redisClient.del(`refresh_token:${userId}`);
    }

    // Delete all refresh tokens from database
    await prisma.refreshToken.deleteMany({
      where: { userId }
    });

    // Log logout
    await logAuditTrail({
      userId,
      actionType: 'USER_LOGOUT',
      outcome: 'SUCCESS',
      ipAddress,
      userAgent
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Validate JWT token and return payload
 */
export const validateToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_PUBLIC_KEY, {
      algorithms: ['RS256']
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
};

/**
 * Generate access and refresh tokens
 */
const generateTokens = async (
  userId: string,
  email: string,
  role: string
): Promise<AuthTokens> => {
  // Generate access token (24h expiry)
  const accessToken = jwt.sign(
    { userId, email, role },
    JWT_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_EXPIRY
    }
  );

  // Generate refresh token (30d expiry)
  const refreshToken = jwt.sign(
    { userId, email, role },
    JWT_PRIVATE_KEY,
    {
      algorithm: 'RS256',
      expiresIn: REFRESH_TOKEN_EXPIRY
    }
  );

  // Store refresh token hash in Redis
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  if (redisClient) {
    await redisClient.setEx(
      `refresh_token:${userId}`,
      30 * 24 * 60 * 60, // 30 days in seconds
      tokenHash
    );
  }

  // Store refresh token in database
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt
    }
  });

  return { accessToken, refreshToken };
};

/**
 * Track failed login attempts
 */
const trackFailedLogin = async (
  email: string,
  ipAddress?: string,
  userAgent?: string,
  reason?: string
): Promise<void> => {
  // Increment login attempts in Redis
  if (redisClient) {
    const attemptKey = `login_attempts:${email}`;
    const attempts = await redisClient.incr(attemptKey);
    
    // Set expiry on first attempt
    if (attempts === 1) {
      await redisClient.expire(attemptKey, LOCKOUT_DURATION_MS / 1000);
    }
  }

  // Log failed login
  await logAuditTrail({
    actionType: 'USER_LOGIN_FAILED',
    outcome: 'FAILURE',
    details: { reason, email },
    ipAddress,
    userAgent
  });
};

/**
 * Generate a 6-digit OTP
 */
const generateOTP = (): string => {
  // Generate a random 6-digit number
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp;
};

/**
 * Send OTP to user's phone via SMS
 */
export const sendOTP = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.phone) {
      throw new Error('User does not have a phone number registered');
    }

    if (!user.mfaEnabled) {
      throw new Error('MFA is not enabled for this user');
    }

    // Generate OTP
    const otp = generateOTP();

    // Store OTP in Redis with 5-minute expiry
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }

    const otpKey = `otp:${userId}`;
    await redisClient.setEx(otpKey, OTP_EXPIRY_SECONDS, otp);

    // TODO: Send OTP via SMS using Twilio/MSG91
    // For now, we'll just log it (in production, this should send actual SMS)
    console.log(`OTP for user ${userId} (${user.phone}): ${otp}`);

    // Log OTP generation
    await logAuditTrail({
      userId,
      actionType: 'OTP_SENT',
      outcome: 'SUCCESS',
      details: { phone: user.phone },
      ipAddress,
      userAgent
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Verify OTP provided by user
 */
export const verifyOTP = async (
  userId: string,
  otp: string,
  ipAddress?: string,
  userAgent?: string
): Promise<boolean> => {
  try {
    if (!redisClient) {
      throw new Error('Redis client not initialized');
    }

    // Get stored OTP from Redis
    const otpKey = `otp:${userId}`;
    const storedOTP = await redisClient.get(otpKey);

    if (!storedOTP) {
      await logAuditTrail({
        userId,
        actionType: 'OTP_VERIFICATION_FAILED',
        outcome: 'FAILURE',
        details: { reason: 'OTP expired or not found' },
        ipAddress,
        userAgent
      });
      throw new Error('OTP expired or not found');
    }

    // Verify OTP
    if (otp !== storedOTP) {
      await logAuditTrail({
        userId,
        actionType: 'OTP_VERIFICATION_FAILED',
        outcome: 'FAILURE',
        details: { reason: 'Invalid OTP' },
        ipAddress,
        userAgent
      });
      return false;
    }

    // Delete OTP after successful verification
    await redisClient.del(otpKey);

    // Log successful verification
    await logAuditTrail({
      userId,
      actionType: 'OTP_VERIFIED',
      outcome: 'SUCCESS',
      ipAddress,
      userAgent
    });

    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Complete login after OTP verification
 */
export const completeLoginWithOTP = async (
  userId: string,
  otp: string,
  ipAddress?: string,
  userAgent?: string
): Promise<AuthTokens> => {
  try {
    // Verify OTP
    const isValid = await verifyOTP(userId, otp, ipAddress, userAgent);

    if (!isValid) {
      throw new Error('Invalid OTP');
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Generate tokens
    const tokens = await generateTokens(user.id, user.email, user.role);

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Log successful login with MFA
    await logAuditTrail({
      userId: user.id,
      actionType: 'USER_LOGIN_MFA',
      outcome: 'SUCCESS',
      details: { email: user.email },
      ipAddress,
      userAgent
    });

    return tokens;
  } catch (error) {
    throw error;
  }
};

/**
 * Enable MFA for a user
 */
export const enableMFA = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    // Update user to enable MFA
    await prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true }
    });

    // Log MFA enablement
    await logAuditTrail({
      userId,
      actionType: 'MFA_ENABLED',
      outcome: 'SUCCESS',
      ipAddress,
      userAgent
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Disable MFA for a user
 */
export const disableMFA = async (
  userId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> => {
  try {
    // Update user to disable MFA
    await prisma.user.update({
      where: { id: userId },
      data: { 
        mfaEnabled: false,
        mfaSecret: null
      }
    });

    // Log MFA disablement
    await logAuditTrail({
      userId,
      actionType: 'MFA_DISABLED',
      outcome: 'SUCCESS',
      ipAddress,
      userAgent
    });
  } catch (error) {
    throw error;
  }
};
