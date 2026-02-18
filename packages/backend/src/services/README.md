# Authentication Service

This directory contains the authentication service for the SageSure India Platform.

## Overview

The authentication service provides secure user registration, login, token management, and role-based access control (RBAC) for the platform.

## Features

- **User Registration**: Create new user accounts with encrypted passwords
- **User Login**: Authenticate users and issue JWT tokens
- **Token Refresh**: Refresh expired access tokens using refresh tokens
- **User Logout**: Invalidate refresh tokens
- **JWT Authentication**: Verify JWT tokens for protected routes
- **RBAC**: Role-based access control with 6 user roles
- **Rate Limiting**: Exponential backoff after failed login attempts
- **Audit Logging**: All authentication events are logged

## User Roles

The platform supports the following user roles:

- `CONSUMER`: End users purchasing or managing insurance policies
- `BROKER`: Licensed insurance intermediaries selling policies
- `AGENT`: Insurance company representatives selling policies
- `INSURER`: Insurance companies providing coverage
- `REGULATOR`: IRDAI or government oversight bodies
- `ADMIN`: Platform administrators

## API Endpoints

### POST /api/v1/auth/register

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "role": "CONSUMER",
  "name": "John Doe",
  "phone": "+911234567890"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "role": "CONSUMER"
  }
}
```

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@$!%*?&)

### POST /api/v1/auth/login

Login with email and password to receive JWT tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Rate Limiting:**
- After 5 failed login attempts, the account is locked for 15 minutes
- Failed attempts are tracked per email address

### POST /api/v1/auth/refresh

Refresh an expired access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### POST /api/v1/auth/logout

Logout and invalidate refresh tokens.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

## JWT Tokens

### Access Token
- **Algorithm**: RS256 (RSA with SHA-256)
- **Expiry**: 24 hours
- **Payload**: userId, email, role, iat, exp

### Refresh Token
- **Algorithm**: RS256 (RSA with SHA-256)
- **Expiry**: 30 days
- **Storage**: Hashed in Redis and PostgreSQL
- **Usage**: Generate new access tokens

## Security

### Password Hashing
- **Algorithm**: bcrypt
- **Rounds**: 12
- **Salt**: Automatically generated per password

### JWT Signing
- **Algorithm**: RS256 (asymmetric encryption)
- **Private Key**: Stored in Azure Key Vault (production)
- **Public Key**: Used for token verification

### Token Storage
- **Access Tokens**: Client-side only (not stored server-side)
- **Refresh Tokens**: Hashed and stored in Redis + PostgreSQL
- **Token Invalidation**: Refresh tokens deleted on logout

## Middleware

### authenticate

Verifies JWT tokens and attaches user context to requests.

**Usage:**
```typescript
import { authenticate } from '../middleware/authenticate';

router.get('/protected', authenticate, handler);
```

**Request Context:**
```typescript
req.user = {
  userId: string;
  email: string;
  role: string;
};
```

### authorize

Checks if authenticated user has required role permissions.

**Usage:**
```typescript
import { authenticate } from '../middleware/authenticate';
import { authorize } from '../middleware/authorize';
import { UserRole } from '../types/auth';

// Single role
router.get('/admin-only', authenticate, authorize([UserRole.ADMIN]), handler);

// Multiple roles
router.get('/insurers', 
  authenticate, 
  authorize([UserRole.INSURER, UserRole.ADMIN]), 
  handler
);
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input data |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `TOKEN_EXPIRED` | 401 | Access token has expired |
| `INVALID_TOKEN` | 401 | Invalid JWT token |
| `INVALID_CREDENTIALS` | 401 | Incorrect email or password |
| `INVALID_REFRESH_TOKEN` | 401 | Invalid or expired refresh token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `USER_EXISTS` | 409 | Email already registered |
| `ACCOUNT_LOCKED` | 429 | Too many failed login attempts |

## Testing

### Unit Tests
```bash
npm test auth.service.test.ts
```

Tests specific edge cases:
- Registration with duplicate email
- Login with incorrect password
- Token refresh with expired token
- RBAC for all role combinations

### Property Tests
```bash
npm test auth.service.property.test.ts
```

Tests universal properties:
- **Property 1**: Password encryption irreversibility
- **Property 2**: JWT token expiry enforcement
- **Property 3**: Access control enforcement

### Integration Tests
```bash
npm test auth.controller.test.ts
```

Tests complete authentication flows:
- Registration → Login → Refresh → Logout
- Error handling for all endpoints
- Rate limiting behavior

## Environment Variables

```env
# JWT Keys (RS256)
JWT_PRIVATE_KEY=<RSA private key>
JWT_PUBLIC_KEY=<RSA public key>

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sagesure

# Redis
REDIS_URL=redis://localhost:6379
```

## Production Deployment

### Azure Key Vault Integration

In production, JWT keys should be loaded from Azure Key Vault:

```typescript
import { SecretClient } from '@azure/keyvault-secrets';

const keyVaultUrl = process.env.AZURE_KEYVAULT_URL;
const client = new SecretClient(keyVaultUrl, credential);

const privateKey = await client.getSecret('jwt-private-key');
const publicKey = await client.getSecret('jwt-public-key');
```

### Redis Configuration

Use Azure Cache for Redis in production:

```typescript
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    tls: true,
    rejectUnauthorized: true
  }
});
```

## Audit Logging

All authentication events are logged to the `audit_trail` table:

- User registration (success/failure)
- User login (success/failure)
- Token refresh (success/failure)
- User logout
- Authentication failures
- Authorization failures

Each log entry includes:
- Timestamp
- User ID (if authenticated)
- Action type
- Outcome (SUCCESS/FAILURE)
- IP address
- User agent
- Additional details

## Compliance

The authentication service complies with:

- **IRDAI Guidelines**: Audit trail for all authentication events
- **DPDP Act 2023**: Consent management and data protection
- **OWASP Top 10**: Protection against common vulnerabilities
- **NIST Guidelines**: Password hashing and token management best practices
