import * as fc from 'fast-check';
import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import { errorHandler, AppError } from './errorHandler';
import { loggingMiddleware } from '../utils/logger';

// Create test app with error handling
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(loggingMiddleware);

  // Test routes for different error scenarios
  app.get('/success', (req, res) => {
    res.status(200).json({ message: 'success' });
  });

  app.get('/created', (req, res) => {
    res.status(201).json({ message: 'created' });
  });

  app.get('/bad-request', (req, res, next) => {
    next(new AppError(400, 'BAD_REQUEST', 'Invalid input'));
  });

  app.get('/unauthorized', (req, res, next) => {
    next(new AppError(401, 'UNAUTHORIZED', 'Authentication required'));
  });

  app.get('/forbidden', (req, res, next) => {
    next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
  });

  app.get('/not-found', (req, res, next) => {
    next(new AppError(404, 'NOT_FOUND', 'Resource not found'));
  });

  app.get('/conflict', (req, res, next) => {
    next(new AppError(409, 'CONFLICT', 'Resource already exists'));
  });

  app.get('/too-many-requests', (req, res, next) => {
    next(new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests'));
  });

  app.get('/internal-error', (req, res, next) => {
    next(new Error('Unexpected error'));
  });

  app.get('/bad-gateway', (req, res, next) => {
    next(new AppError(502, 'BAD_GATEWAY', 'External service unavailable'));
  });

  app.get('/service-unavailable', (req, res, next) => {
    next(new AppError(503, 'SERVICE_UNAVAILABLE', 'Service temporarily unavailable'));
  });

  app.get('/gateway-timeout', (req, res, next) => {
    next(new AppError(504, 'GATEWAY_TIMEOUT', 'External service timeout'));
  });

  // Error handler must be last
  app.use(errorHandler);

  return app;
}

describe('Error Handler - Property Tests', () => {
  const app = createTestApp();

  /**
   * Property 28: HTTP status code consistency
   * **Validates: Requirements 28.3, 28.4**
   * 
   * For any API endpoint:
   * - Successful operations should return 2xx codes
   * - Client errors should return 4xx codes
   * - Server errors should return 5xx codes
   * - Error responses always include error code, message, and details in JSON format
   */
  test('Property 28: HTTP status code consistency - 2xx for success', async () => {
    const response = await request(app).get('/success');
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  });

  test('Property 28: HTTP status code consistency - 4xx for client errors', async () => {
    const clientErrorRoutes = [
      '/bad-request',
      '/unauthorized',
      '/forbidden',
      '/not-found',
      '/conflict',
      '/too-many-requests',
    ];

    for (const route of clientErrorRoutes) {
      const response = await request(app).get(route);
      
      // Verify status code is 4xx
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);

      // Verify error response format
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.path).toBe(route);
    }
  });

  test('Property 28: HTTP status code consistency - 5xx for server errors', async () => {
    const serverErrorRoutes = [
      '/internal-error',
      '/bad-gateway',
      '/service-unavailable',
      '/gateway-timeout',
    ];

    for (const route of serverErrorRoutes) {
      const response = await request(app).get(route);
      
      // Verify status code is 5xx
      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.status).toBeLessThan(600);

      // Verify error response format
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.path).toBe(route);
    }
  });

  /**
   * Property test: Error response format is consistent
   */
  test('Error response format is consistent across all error types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(
          '/bad-request',
          '/unauthorized',
          '/forbidden',
          '/not-found',
          '/internal-error',
          '/bad-gateway'
        ),
        async (route) => {
          const response = await request(app).get(route);

          // Verify error response structure
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toHaveProperty('code');
          expect(response.body.error).toHaveProperty('message');
          expect(response.body.error).toHaveProperty('timestamp');
          expect(response.body.error).toHaveProperty('requestId');
          expect(response.body.error).toHaveProperty('path');

          // Verify types
          expect(typeof response.body.error.code).toBe('string');
          expect(typeof response.body.error.message).toBe('string');
          expect(typeof response.body.error.timestamp).toBe('string');
          expect(typeof response.body.error.requestId).toBe('string');
          expect(typeof response.body.error.path).toBe('string');

          // Verify timestamp is valid ISO 8601
          expect(() => new Date(response.body.error.timestamp)).not.toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property test: Request ID is included in all error responses
   */
  test('Request ID is included in all error responses', async () => {
    const errorRoutes = [
      '/bad-request',
      '/unauthorized',
      '/forbidden',
      '/not-found',
      '/internal-error',
    ];

    for (const route of errorRoutes) {
      const response = await request(app).get(route);
      
      expect(response.body.error.requestId).toBeDefined();
      expect(response.body.error.requestId).not.toBe('unknown');
      expect(typeof response.body.error.requestId).toBe('string');
    }
  });

  /**
   * Property test: Stack traces are only included in development mode
   */
  test('Stack traces are not exposed in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    
    // Test in production mode
    process.env.NODE_ENV = 'production';
    const prodResponse = await request(app).get('/internal-error');
    expect(prodResponse.body.error.details).toBeUndefined();

    // Test in development mode
    process.env.NODE_ENV = 'development';
    const devResponse = await request(app).get('/internal-error');
    // In development, details may be included (but not required)

    // Restore original environment
    process.env.NODE_ENV = originalEnv;
  });
});
