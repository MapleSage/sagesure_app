import winston from 'winston';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

const logLevel = process.env.LOG_LEVEL || 'info';

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  defaultMeta: { service: 'sagesure-backend' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
    // File transports
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// If in production, add Azure Log Analytics transport
if (process.env.NODE_ENV === 'production' && process.env.AZURE_LOG_ANALYTICS_WORKSPACE_ID) {
  // TODO: Add Azure Log Analytics transport
  logger.info('Azure Log Analytics transport would be configured in production');
}

// Extend Express Request type to include request context
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startTime?: number;
    }
  }
}

/**
 * Logging middleware that adds request context and logs all HTTP requests
 * Implements Requirements 24.1, 24.2, 24.3
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Generate or use existing request ID
  req.requestId = (req.headers['x-request-id'] as string) || randomUUID();
  req.startTime = Date.now();

  // Set request ID in response header
  res.setHeader('X-Request-ID', req.requestId);

  // Extract user context if available
  const userId = (req as any).user?.userId;
  const ipAddress = req.ip || req.socket.remoteAddress;

  // Log incoming request
  logger.info('Incoming request', {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userId,
    ipAddress,
    userAgent: req.headers['user-agent'],
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (data: any) {
    const duration = Date.now() - (req.startTime || 0);
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger.log(logLevel, 'Request completed', {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId,
      ipAddress,
    });

    return originalSend.call(this, data);
  };

  next();
};
