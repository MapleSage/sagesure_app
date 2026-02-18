/**
 * Integration tests for authentication controller
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from '../routes/auth.routes';
import { errorHandler } from '../middleware/errorHandler';
import * as authService from '../services/auth.service';
import { UserRole } from '../types/auth';

const prisma = new PrismaClient();
const app = express();

// Setup app
app.use(express.json());
app.use((req, _res, next) => {
  req.id = 'test-request-id';
  next();
});
app.use('/api/v1/auth', authRoutes);
app.use(errorHandler);

// Mock Redis
const mockRedisClient = {
  get: jest.fn(),
  set: jest.fn(),
  setEx: jest.fn(),
  del: jest.fn(),
  incr: jest.fn(),
  expire: jest.fn()
};

authService.initializeRedis(mockRedisClient);

// Mock JWT keys
process.env.JWT_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF0qHPJqXZvBLEqXXXXXXXXXXXXXX
-----END RSA PRIVATE KEY-----`;

process.env.JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWy
-----END PUBLIC KEY-----`;

describe('Authentication Controller - Integration Tests', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.refreshToken.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisClient.setEx.mockResolvedValue('OK');
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.incr.mockResolvedValue(1);
    mockRedisClient.expire.mockResolvedValue(1);
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          password: 'TestPassword123!',
          role: 'CONSUMER',
          name: 'Test User',
          phone: '+911234567890'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBeTruthy();
      expect(response.body.data.userId).toBeTruthy();
      expect(response.body.data.role).toBe('CONSUMER');

      // Clean up
      await prisma.user.delete({ where: { id: response.body.data.userId } });
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: 'TestPassword123!',
          role: 'CONSUMER'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeTruthy();
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          password: 'weak',
          role: 'CONSUMER'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with invalid role', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: `test_${Date.now()}@example.com`,
          password: 'TestPassword123!',
          role: 'INVALID_ROLE'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject duplicate email registration', async () => {
      const email = `duplicate_${Date.now()}@example.com`;

      // First registration
      const response1 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'TestPassword123!',
          role: 'CONSUMER'
        });

      expect(response1.status).toBe(201);

      // Second registration with same email
      const response2 = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email,
          password: 'TestPassword123!',
          role: 'BROKER'
        });

      expect(response2.status).toBe(409);
      expect(response2.body.error.code).toBe('USER_EXISTS');

      // Clean up
      await prisma.user.delete({ where: { id: response1.body.data.userId } });
    });
  });

  describe('POST /api/v1/auth/login', () => {
    let testUser: any;
    const testEmail = `login_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      // Create test user
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          role: 'CONSUMER'
        });
      testUser = response.body.data;
    });

    afterEach(async () => {
      // Clean up
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.delete({ where: { id: testUser.userId } });
    });

    it('should login with correct credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
    });

    it('should reject login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with non-existent email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login with missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should lock account after 5 failed attempts', async () => {
      mockRedisClient.get.mockResolvedValue('5');

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!'
        });

      expect(response.status).toBe(429);
      expect(response.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let testUser: any;
    let tokens: any;
    const testEmail = `refresh_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      // Create test user and login
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          role: 'CONSUMER'
        });
      testUser = registerResponse.body.data;

      mockRedisClient.get.mockResolvedValue('mock-hash');

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });
      tokens = loginResponse.body.data;
    });

    afterEach(async () => {
      // Clean up
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.userId } });
      await prisma.user.delete({ where: { id: testUser.userId } });
    });

    it('should refresh tokens with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: tokens.refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeTruthy();
      expect(response.body.data.refreshToken).toBeTruthy();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid-token'
        });

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('should reject missing refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let testUser: any;
    let tokens: any;
    const testEmail = `logout_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    beforeEach(async () => {
      // Create test user and login
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          role: 'CONSUMER'
        });
      testUser = registerResponse.body.data;

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testPassword
        });
      tokens = loginResponse.body.data;
    });

    afterEach(async () => {
      // Clean up
      await prisma.user.delete({ where: { id: testUser.userId } });
    });

    it('should logout with valid access token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify refresh tokens are deleted
      const refreshTokens = await prisma.refreshToken.findMany({
        where: { userId: testUser.userId }
      });
      expect(refreshTokens).toHaveLength(0);
    });

    it('should reject logout without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout');

      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject logout with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });
});
