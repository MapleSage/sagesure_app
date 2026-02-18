import * as fc from 'fast-check';
import express, { Express } from 'express';
import request from 'supertest';
import { rateLimiter, strictRateLimiter } from './rateLimiter';
import { loggingMiddleware } from '../utils/logger';

// Create test app
function createTestApp(limiter: any): Express {
  const app = express();
  app.use(loggingMiddleware);
  app.use(limiter);
  
  app.get('/test', (req, res) => {
    res.status(200).json({ message: 'success' });
  });

  return app;
}

describe('Rate Limiter - Property Tests', () => {
  /**
   * Property 27: Rate limiting enforcement
   * **Validates: Requirements 23.9, 23.10**
   * 
   * For any user, 101st request in 1 minute should return HTTP 429
   * with Retry-After header
   */
  test('Property 27: Rate limiting enforcement - 101st request returns 429', async () => {
    const app = createTestApp(rateLimiter);

    // Make 100 requests (should all succeed)
    for (let i = 0; i < 100; i++) {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    }

    // 101st request should be rate limited
    const response = await request(app).get('/test');
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(response.headers['retry-after']).toBeDefined();
  }, 120000); // 2 minute timeout

  /**
   * Property test: Strict rate limiter enforces lower limit
   */
  test('Strict rate limiter enforces 20 requests per minute', async () => {
    const app = createTestApp(strictRateLimiter);

    // Make 20 requests (should all succeed)
    for (let i = 0; i < 20; i++) {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
    }

    // 21st request should be rate limited
    const response = await request(app).get('/test');
    expect(response.status).toBe(429);
    expect(response.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
  }, 60000);

  /**
   * Property test: Rate limit resets after window expires
   */
  test('Rate limit resets after time window', async () => {
    const app = createTestApp(rateLimiter);

    // Make 100 requests
    for (let i = 0; i < 100; i++) {
      await request(app).get('/test');
    }

    // 101st request should be rate limited
    let response = await request(app).get('/test');
    expect(response.status).toBe(429);

    // Wait for rate limit window to reset (61 seconds)
    await new Promise((resolve) => setTimeout(resolve, 61000));

    // Request should succeed after reset
    response = await request(app).get('/test');
    expect(response.status).toBe(200);
  }, 180000); // 3 minute timeout
});
