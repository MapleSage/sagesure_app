# Core Middleware and Utilities

This directory contains the core middleware and utilities for the SageSure India Platform backend.

## Middleware

### Logging Middleware (`logger.ts`)
**Implements Requirements: 24.1, 24.2, 24.3**

Structured JSON logging with Winston that:
- Adds request context (request ID, user ID, IP address)
- Logs all HTTP requests with duration and status code
- Supports log levels: ERROR, WARN, INFO, DEBUG
- Integrates with Azure Log Analytics in production

Usage:
```typescript
import { loggingMiddleware } from './utils/logger';
app.use(loggingMiddleware);
```

### Error Handler (`errorHandler.ts`)
**Implements Requirements: 28.3, 28.4**

Global error handler that:
- Provides consistent error response format
- Classifies errors (4xx client errors, 5xx server errors)
- Includes request ID and timestamp in all error responses
- Logs all errors with stack traces

Usage:
```typescript
import { errorHandler } from './middleware/errorHandler';
app.use(errorHandler); // Must be last middleware
```

### Rate Limiter (`rateLimiter.ts`)
**Implements Requirements: 23.9, 23.10**

Rate limiting middleware using express-rate-limit with Redis store:
- Standard limiter: 100 requests per minute per user
- Strict limiter: 20 requests per minute per IP (for auth endpoints)
- Returns HTTP 429 with Retry-After header when exceeded
- Distributed rate limiting across multiple instances

Usage:
```typescript
import { rateLimiter, strictRateLimiter } from './middleware/rateLimiter';

// Apply to all routes
app.use(rateLimiter);

// Apply strict limiting to auth routes
app.use('/api/v1/auth', strictRateLimiter);
```

## Utilities

### Audit Logger (`auditLogger.ts`)
**Implements Requirements: 1.10, 21.1, 21.5**

Audit logging utility that:
- Logs all user actions to audit_trail table
- Includes timestamp, user ID, action type, IP address, outcome
- Adds cryptographic hashing for tamper-proof logs
- Supports querying and verification of audit logs

Usage:
```typescript
import { logAuditTrail } from './utils/auditLogger';

await logAuditTrail({
  userId: user.id,
  actionType: 'LOGIN',
  ipAddress: req.ip,
  outcome: 'SUCCESS',
});
```

## Property-Based Tests

All middleware and utilities include comprehensive property-based tests using fast-check:

### Property 23: Audit log completeness
**Validates: Requirements 21.1**

For any user action, audit log should be created with all required fields (timestamp, user ID, action type, IP address, outcome, hash).

### Property 24: Audit log immutability
**Validates: Requirements 21.5**

For any audit log entry, modification attempts should fail and the cryptographic hash should detect tampering.

### Property 27: Rate limiting enforcement
**Validates: Requirements 23.9, 23.10**

For any user, the 101st request in 1 minute should return HTTP 429 with Retry-After header.

### Property 28: HTTP status code consistency
**Validates: Requirements 28.3, 28.4**

For any API error:
- Successful operations return 2xx codes
- Client errors return 4xx codes
- Server errors return 5xx codes
- Error responses always include error code, message, timestamp, requestId, and path in JSON format

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- auditLogger.test.ts

# Run property tests with verbose output
npm test -- --verbose
```

## Test Configuration

Property-based tests run 100 iterations by default to ensure comprehensive coverage. Tests have a 3-minute timeout to accommodate the large number of test cases.

Configure in `jest.config.js`:
```javascript
testTimeout: 180000, // 3 minutes for property-based tests
```
