import express from 'express';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/auth.routes';
import scamShieldRoutes from './routes/scamshield.routes';
import familyRoutes from './routes/family.routes';
import policyPulseRoutes from './routes/policyPulse.routes';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_VERSION = process.env.API_VERSION || 'v1';

// Request ID middleware
app.use((req, _res, next) => {
  req.id = uuidv4();
  next();
});

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting middleware
app.use(rateLimiter);

// Health check endpoints
app.get('/health/live', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (_req, res) => {
  // TODO: Add database and Redis connectivity checks
  res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
});

// API routes will be added here
app.get(`/api/${API_VERSION}`, (_req, res) => {
  res.json({
    message: 'SageSure India Platform API',
    version: API_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Authentication routes
app.use(`/api/${API_VERSION}/auth`, authRoutes);

// ScamShield routes
app.use(`/api/${API_VERSION}/scamshield`, scamShieldRoutes);

// Family routes
app.use(`/api/${API_VERSION}/family`, familyRoutes);

// Policy Pulse routes
app.use(`/api/${API_VERSION}/policy-pulse`, policyPulseRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`API Version: ${API_VERSION}`);
});

export default app;
