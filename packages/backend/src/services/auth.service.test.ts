/**
 * Unit tests for authentication service edge cases
 */

import { PrismaClient } from '@prisma/client';
import * as authService from './auth.service';
import { UserRole } from '../types/auth';

const prisma = new PrismaClient();

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn()
};

// Initialize auth service with mock Redis
authService.initializeRedis(mockRedisClient);

// Mock JWT keys for testing
process.env.JWT_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF0qHPJqXZvBLEqXXXXXXXXXXXXXX
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
-----END RSA PRIVATE KEY-----`;

process.env.JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWy
XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
-----END PUBLIC KEY-----`;

describe('Authentication Service - Unit Tests', () => {
  beforeAll(async () => {
    // Clean up test database
    await prisma.user.deleteMany({});
    await prisma.refreshToken.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Registration', () => {
    it('should successfully register a new user', async () => {
      const email = `test_${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const user = await authService.register({
        email,
        password,
        role: UserRole.CONSUMER,
        name: 'Test User',
        phone: '+911234567890'
      });

      expect(user.email).toBe(email);
      expect(user.role).toBe(UserRole.CONSUMER);
      expect(user.userId).toBeTruthy();

      // Clean up
      await prisma.user.delete({ where: { id: user.userId } });
    });

    it('should reject registration with duplicate email', async () => {
      const email = `duplicate_${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      // Register first user
      const user1 = await authService.register({
        email,
        password,
        role: UserRole.CONSUMER
      });

      // Attempt to register with same email
      await expect(
        authService.register({
          email,
          password,
          role: UserRole.BROKER
        })
      ).rejects.toThrow('User with this email already exists');

      // Clean up
      await prisma.user.delete({ where: { id: user1.userId } });
    });

    it('should hash passwords with bcrypt', async () => {
      const email = `hash_test_${Date.now()}@example.com`;
      const password = 'TestPassword123!';

      const user = await authService.register({
        email,
        password,
        role: UserRole.CONSUMER
      });

      const dbUser = await prisma.user.findUnique({
        where: { id: user.userId }
      });

      // Password should be hashed
      expect(dbUser?.passwordHash).not.toBe(password);
      expect(dbUser?.passwordHash).toMatch(/^\$2[aby]\$12\$/); // bcrypt format with 12 rounds

      // Clean up
      await prisma.user.delete({ where: { id: user.userId } });
    });
  });

  describe('User Login', () => {
    let testUser: any;
    const testEmail = `login_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      // Create test user
      testUser = await authService.register({
        email: testEmail,
        password: testPassword,
        role: UserRole.CONSUMER
      });
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);
    });

    afterEach(async () => {
      // Clean up
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.delete({ where: { id: testUser.userId } });
    });

    it('should successfully login with correct credentials', async () => {
      const tokens = await authService.login({
        email: testEmail,
        password: testPassword
      });

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();

      // Verify tokens are valid JWTs
      const payload = authService.validateToken(tokens.accessToken);
      expect(payload.email).toBe(testEmail);
      expect(payload.role).toBe(UserRole.CONSUMER);
    });

    it('should reject login with incorrect password', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await expect(
        authService.login({
          email: testEmail,
          password: 'WrongPassword123!'
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should reject login with non-existent email', async () => {
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.incr.mockResolvedValue(1);
      mockRedisClient.expire.mockResolvedValue(1);

      await expect(
        authService.login({
          email: 'nonexistent@example.com',
          password: testPassword
        })
      ).rejects.toThrow('Invalid email or password');
    });

    it('should implement exponential backoff after 5 failed attempts', async () => {
      // Mock 5 failed attempts
      mockRedisClient.get.mockResolvedValue('5');

      await expect(
        authService.login({
          email: testEmail,
          password: 'WrongPassword123!'
        })
      ).rejects.toThrow('Account temporarily locked');
    });

    it('should update last login timestamp on successful login', async () => {
      const beforeLogin = new Date();

      await authService.login({
        email: testEmail,
        password: testPassword
      });

      const user = await prisma.user.findUnique({
        where: { id: testUser.userId }
      });

      expect(user?.lastLogin).toBeTruthy();
      expect(user?.lastLogin!.getTime()).toBeGreaterThanOrEqual(beforeLogin.getTime());
    });
  });

  describe('Token Refresh', () => {
    let testUser: any;
    let tokens: any;
    const testEmail = `refresh_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      // Create test user and login
      testUser = await authService.register({
        email: testEmail,
        password: testPassword,
        role: UserRole.CONSUMER
      });
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue('mock-hash');
      tokens = await authService.login({
        email: testEmail,
        password: testPassword
      });
    });

    afterEach(async () => {
      // Clean up
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.delete({ where: { id: testUser.userId } });
    });

    it('should generate new tokens with valid refresh token', async () => {
      const newTokens = await authService.refreshToken(tokens.refreshToken);

      expect(newTokens.accessToken).toBeTruthy();
      expect(newTokens.refreshToken).toBeTruthy();
      expect(newTokens.accessToken).not.toBe(tokens.accessToken);
    });

    it('should reject expired refresh token', async () => {
      // Delete refresh token from database to simulate expiry
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.userId } });

      await expect(
        authService.refreshToken(tokens.refreshToken)
      ).rejects.toThrow('Invalid or expired refresh token');
    });

    it('should reject invalid refresh token', async () => {
      await expect(
        authService.refreshToken('invalid-token')
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('User Logout', () => {
    let testUser: any;
    const testEmail = `logout_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      // Create test user and login
      testUser = await authService.register({
        email: testEmail,
        password: testPassword,
        role: UserRole.CONSUMER
      });
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.del.mockResolvedValue(1);
      await authService.login({
        email: testEmail,
        password: testPassword
      });
    });

    afterEach(async () => {
      // Clean up
      await prisma.user.delete({ where: { id: testUser.userId } });
    });

    it('should invalidate refresh tokens on logout', async () => {
      await authService.logout(testUser.userId);

      // Verify refresh tokens are deleted
      const tokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.userId }
      });

      expect(tokens).toHaveLength(0);
    });

    it('should delete refresh token from Redis on logout', async () => {
      await authService.logout(testUser.userId);

      expect(mockRedisClient.del).toHaveBeenCalledWith(`refresh_token:${testUser.userId}`);
    });
  });

  describe('RBAC - Role-Based Access Control', () => {
    it('should support all defined user roles', async () => {
      const roles = [
        UserRole.CONSUMER,
        UserRole.BROKER,
        UserRole.AGENT,
        UserRole.INSURER,
        UserRole.REGULATOR,
        UserRole.ADMIN
      ];

      for (const role of roles) {
        const email = `role_test_${role}_${Date.now()}@example.com`;
        const user = await authService.register({
          email,
          password: 'TestPassword123!',
          role
        });

        expect(user.role).toBe(role);

        // Clean up
        await prisma.user.delete({ where: { id: user.userId } });
      }
    });

    it('should include role in JWT token payload', async () => {
      const email = `jwt_role_test_${Date.now()}@example.com`;
      const user = await authService.register({
        email,
        password: 'TestPassword123!',
        role: UserRole.BROKER
      });

      mockRedisClient.setEx.mockResolvedValue('OK');
      const tokens = await authService.login({
        email,
        password: 'TestPassword123!'
      });

      const payload = authService.validateToken(tokens.accessToken);
      expect(payload.role).toBe(UserRole.BROKER);

      // Clean up
      await prisma.refreshToken.deleteMany({ where: { userId: user.userId } });
      await prisma.user.delete({ where: { id: user.userId } });
    });
  });

  describe('Token Validation', () => {
    it('should validate token structure', () => {
      expect(() => authService.validateToken('not-a-jwt')).toThrow();
      expect(() => authService.validateToken('a.b.c')).toThrow();
      expect(() => authService.validateToken('')).toThrow();
    });

    it('should reject tokens with invalid signature', () => {
      const token = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkNPTlNVTUVSIn0.invalid-signature';
      
      expect(() => authService.validateToken(token)).toThrow('Invalid token');
    });
  });

  describe('Multi-Factor Authentication (MFA)', () => {
    let testUser: any;
    const testEmail = `mfa_test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';
    const testPhone = '+911234567890';

    beforeEach(async () => {
      // Create test user with phone number
      testUser = await authService.register({
        email: testEmail,
        password: testPassword,
        role: UserRole.CONSUMER,
        phone: testPhone
      });
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.get.mockResolvedValue(null);
      mockRedisClient.del.mockResolvedValue(1);
    });

    afterEach(async () => {
      // Clean up
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.delete({ where: { id: testUser.userId } });
    });

    describe('OTP Generation', () => {
      it('should generate 6-digit OTP', async () => {
        // Enable MFA for user
        await authService.enableMFA(testUser.userId);

        // Send OTP
        await authService.sendOTP(testUser.userId);

        // Verify OTP was stored in Redis with correct expiry
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `otp:${testUser.userId}`,
          300, // 5 minutes in seconds
          expect.stringMatching(/^\d{6}$/) // 6-digit number
        );
      });

      it('should reject OTP generation for user without phone number', async () => {
        // Create user without phone
        const userNoPhone = await authService.register({
          email: `no_phone_${Date.now()}@example.com`,
          password: testPassword,
          role: UserRole.CONSUMER
        });

        await authService.enableMFA(userNoPhone.userId);

        await expect(
          authService.sendOTP(userNoPhone.userId)
        ).rejects.toThrow('User does not have a phone number registered');

        // Clean up
        await prisma.user.delete({ where: { id: userNoPhone.userId } });
      });

      it('should reject OTP generation for user with MFA disabled', async () => {
        await expect(
          authService.sendOTP(testUser.userId)
        ).rejects.toThrow('MFA is not enabled for this user');
      });

      it('should reject OTP generation for non-existent user', async () => {
        const fakeUserId = '00000000-0000-0000-0000-000000000000';
        
        await expect(
          authService.sendOTP(fakeUserId)
        ).rejects.toThrow('User not found');
      });
    });

    describe('OTP Verification', () => {
      it('should verify correct OTP', async () => {
        const testOTP = '123456';
        mockRedisClient.get.mockResolvedValue(testOTP);

        const isValid = await authService.verifyOTP(testUser.userId, testOTP);

        expect(isValid).toBe(true);
        expect(mockRedisClient.del).toHaveBeenCalledWith(`otp:${testUser.userId}`);
      });

      it('should reject incorrect OTP', async () => {
        mockRedisClient.get.mockResolvedValue('123456');

        const isValid = await authService.verifyOTP(testUser.userId, '654321');

        expect(isValid).toBe(false);
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });

      it('should reject expired OTP', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        await expect(
          authService.verifyOTP(testUser.userId, '123456')
        ).rejects.toThrow('OTP expired or not found');
      });

      it('should delete OTP after successful verification', async () => {
        const testOTP = '123456';
        mockRedisClient.get.mockResolvedValue(testOTP);

        await authService.verifyOTP(testUser.userId, testOTP);

        expect(mockRedisClient.del).toHaveBeenCalledWith(`otp:${testUser.userId}`);
      });
    });

    describe('MFA Login Flow', () => {
      it('should require OTP when MFA is enabled', async () => {
        // Enable MFA
        await authService.enableMFA(testUser.userId);

        // Attempt login
        const result = await authService.login({
          email: testEmail,
          password: testPassword
        });

        // Should return MFA required flag
        expect(result.mfaRequired).toBe(true);
        expect(result.userId).toBe(testUser.userId);
        expect(result.accessToken).toBe('');
        expect(result.refreshToken).toBe('');

        // Verify OTP was sent
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `otp:${testUser.userId}`,
          300,
          expect.stringMatching(/^\d{6}$/)
        );
      });

      it('should complete login after OTP verification', async () => {
        // Enable MFA
        await authService.enableMFA(testUser.userId);

        // Login (triggers OTP)
        await authService.login({
          email: testEmail,
          password: testPassword
        });

        // Mock OTP verification
        const testOTP = '123456';
        mockRedisClient.get.mockResolvedValue(testOTP);

        // Complete login with OTP
        const tokens = await authService.completeLoginWithOTP(
          testUser.userId,
          testOTP
        );

        expect(tokens.accessToken).toBeTruthy();
        expect(tokens.refreshToken).toBeTruthy();
        expect(tokens.mfaRequired).toBeUndefined();

        // Verify token payload
        const payload = authService.validateToken(tokens.accessToken);
        expect(payload.email).toBe(testEmail);
      });

      it('should reject login completion with invalid OTP', async () => {
        // Enable MFA
        await authService.enableMFA(testUser.userId);

        // Mock invalid OTP
        mockRedisClient.get.mockResolvedValue('123456');

        await expect(
          authService.completeLoginWithOTP(testUser.userId, '654321')
        ).rejects.toThrow('Invalid OTP');
      });

      it('should not require OTP when MFA is disabled', async () => {
        // Login without MFA
        const tokens = await authService.login({
          email: testEmail,
          password: testPassword
        });

        expect(tokens.mfaRequired).toBeUndefined();
        expect(tokens.accessToken).toBeTruthy();
        expect(tokens.refreshToken).toBeTruthy();
      });
    });

    describe('MFA Enable/Disable', () => {
      it('should enable MFA for user', async () => {
        await authService.enableMFA(testUser.userId);

        const user = await prisma.user.findUnique({
          where: { id: testUser.userId }
        });

        expect(user?.mfaEnabled).toBe(true);
      });

      it('should disable MFA for user', async () => {
        // Enable first
        await authService.enableMFA(testUser.userId);

        // Then disable
        await authService.disableMFA(testUser.userId);

        const user = await prisma.user.findUnique({
          where: { id: testUser.userId }
        });

        expect(user?.mfaEnabled).toBe(false);
        expect(user?.mfaSecret).toBeNull();
      });
    });

    describe('OTP Expiry', () => {
      it('should set OTP expiry to 5 minutes', async () => {
        await authService.enableMFA(testUser.userId);
        await authService.sendOTP(testUser.userId);

        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          `otp:${testUser.userId}`,
          300, // 5 minutes = 300 seconds
          expect.any(String)
        );
      });
    });
  });
});
