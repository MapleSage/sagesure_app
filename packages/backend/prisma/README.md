# Prisma Schema - SageSure India Platform

## Overview

This directory contains the Prisma schema and migrations for the SageSure India Platform database. The schema defines core tables for authentication, authorization, audit logging, and DPDP Act 2023 compliance.

## Core Tables

### 1. users
User accounts with role-based access control (RBAC).

**Supported Roles:**
- CONSUMER: End users purchasing/managing insurance
- BROKER: Licensed insurance intermediaries
- AGENT: Insurance company representatives
- INSURER: Insurance companies
- REGULATOR: IRDAI/government oversight
- ADMIN: Platform administrators

**Features:**
- Email-based authentication with bcrypt password hashing
- Multi-factor authentication (MFA) support via OTP
- Tracks last login timestamp
- Soft updates with created_at/updated_at timestamps

### 2. refresh_tokens
JWT refresh tokens for maintaining user sessions.

**Features:**
- 30-day expiry period
- Tokens stored as hashed values
- Cascade delete when user is removed
- Indexed by user_id for fast lookup

### 3. audit_trail
Comprehensive audit logging for security and compliance.

**Tracks:**
- Authentication attempts (login, logout, MFA)
- Resource access (view, download, upload)
- Data modifications (create, update, delete)
- IP address and user agent for forensics
- Flexible JSONB details field for additional context

**Indexes:**
- user_id: Fast user activity queries
- created_at: Time-based audit reports
- action_type: Filter by specific actions

### 4. consent_log
DPDP Act 2023 compliance for data processing consent.

**Features:**
- Tracks consent purpose and full consent text
- Records grant and revocation timestamps
- Supports multiple consent purposes per user
- Cascade delete when user is removed

## PostgreSQL Extensions

### pgvector
Vector similarity search extension for:
- Ombudsman precedent matching (Claims Defender)
- Policy similarity comparison (Policy Pulse)
- Semantic search across documents

**Installation:**
The extension is automatically enabled via the initial migration:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

## Usage

### Generate Prisma Client
```bash
npm run prisma:generate
```

### Run Migrations
```bash
npm run prisma:migrate
```

### Deploy Migrations (Production)
```bash
npm run prisma:migrate:deploy
```

### Seed Database
```bash
npm run prisma:seed
```

For detailed migration and seeding instructions, see [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md).

### Open Prisma Studio
```bash
npm run prisma:studio
```

### Create New Migration
```bash
npx prisma migrate dev --name <migration_name>
```

## Environment Variables

Required in `.env` file:
```
DATABASE_URL="postgresql://user:password@localhost:5432/sagesure?schema=public"
```

For Azure PostgreSQL Flexible Server:
```
DATABASE_URL="postgresql://admin@server:password@server.postgres.database.azure.com:5432/sagesure?sslmode=require"
```

## Performance Considerations

### Indexes
All performance-critical queries are indexed:
- User lookups by email (unique index)
- Refresh token lookups by user_id
- Audit trail queries by user_id, created_at, action_type
- Consent log queries by user_id

### Connection Pooling
Configure connection pooling in production:
```
DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"
```

Recommended settings per pod:
- Min connections: 10
- Max connections: 50
- Connection timeout: 20s

## Security

### Password Hashing
- bcrypt with 12 rounds (configured in auth service)
- Never store plain text passwords

### Token Storage
- Refresh tokens stored as SHA-256 hashes
- Access tokens (JWT) not stored in database

### Sensitive Data
- MFA secrets encrypted at application layer
- Audit trail details may contain sensitive data (encrypted in JSONB)
- IP addresses stored for security forensics

## Compliance

### DPDP Act 2023
- consent_log table tracks all data processing consent
- Audit trail provides complete data access history
- User deletion cascades to remove all personal data

### IRDAI Requirements
- Audit trail meets regulatory logging requirements
- Consent management for insurance data sharing
- Role-based access control for different stakeholders

## Module Tables

### ScamShield Module (✅ Completed - Task 3.2)
- scam_patterns: Pattern matching database with full-text search
- digital_arrest_incidents: Digital arrest scam tracking
- telemarketer_registry: Phone number verification
- verified_brands: Official insurance brand contacts
- scam_reports: User-reported scam incidents
- family_alerts: Family member notifications

### Policy Pulse Module (✅ Completed - Task 3.2)
- policies: User insurance policies
- policy_ontology: Normalized policy features
- policy_translations: Plain language translations
- red_flags: Mis-selling indicators
- coverage_comparisons: Policy comparison reports

### Upcoming Modules
- Task 3.4: Claims Defender tables (claims, precedents, etc.)
- Task 3.5: Sovereign Vault tables (documents, family_members, etc.)
- Task 3.6: Underwriting Engine tables (health_profiles, risk_scores, etc.)
- Task 3.7: Marketplace tables (quotes, agents, applications, etc.)

## References

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [pgvector Extension](https://github.com/pgvector/pgvector)
- [DPDP Act 2023](https://www.meity.gov.in/writereaddata/files/Digital%20Personal%20Data%20Protection%20Act%202023.pdf)
