import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import { logger } from '../utils/logger';

// Create Redis client for rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err) => {
  logger.error('Redis client error for rate limiter', { error: err });
});

redisClient.on('connect', () => {
  logger.info('Redis client connected for rate limiting');
});

// Connect to Redis
redisClient.connect().catch((err) => {
  logger.error('Failed to connect Redis for rate limiting', { error: err });
});

/**
 * Rate limiting middleware using express-rate-limit with Redis store
 * Implements Requirements 23.9, 23.10
 * 
 * Configuration:
 * - 100 requests per minute per user
 * - Returns HTTP 429 with Retry-After header when exceeded
 * - Uses Redis for distributed rate limiting across multiple instances
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per window per user
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  
  // Use Redis store for distributed rate limiting
  store: new RedisStore({
    // @ts-expect-error - RedisStore types are not fully compatible
    client: redisClient,
    prefix: 'rl:', // Key prefix in Redis
  }),

  // Key generator: use user ID if authenticated, otherwise IP address
  keyGenerator: (req) => {
    const userId = (req as any).user?.userId;
    return userId || req.ip || 'unknown';
  },

  // Handler for rate limit exceeded
  handler: (req, res) => {
    const requestId = (req as any).requestId || 'unknown';
    const userId = (req as any).user?.userId;
    
    logger.warn('Rate limit exceeded', {
      requestId,
      userId,
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        timestamp: new Date().toISOString(),
        requestId,
        path: req.path,
      },
    });
  },

  // Skip rate limiting for certain conditions
  skip: (_req) => {
    // Skip rate limiting in test environment
    if (process.env.NODE_ENV === 'test') {
      return true;
    }
    return false;
  },
});

/**
 * Stricter rate limiter for sensitive endpoints (e.g., authentication)
 * 20 requests per minute per IP
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  
  store: new RedisStore({
    // @ts-expect-error - RedisStore types are not fully compatible
    client: redisClient,
    prefix: 'rl:strict:',
  }),

  keyGenerator: (req) => req.ip || 'unknown',

  handler: (req, res) => {
    const requestId = (req as any).requestId || 'unknown';
    
    logger.warn('Strict rate limit exceeded', {
      requestId,
      ip: req.ip,
      path: req.path,
    });

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        timestamp: new Date().toISOString(),
        requestId,
        path: req.path,
      },
    });
  },

  skip: (_req) => process.env.NODE_ENV === 'test',
});

// Export Redis client for cleanup
export { redisClient };
