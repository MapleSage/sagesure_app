# Database Migration Guide

This guide explains how to run the Prisma migrations and seed the database with initial data for the SageSure India Platform.

## Prerequisites

1. **PostgreSQL 15+** running locally or via Docker
2. **Node.js 18+** installed
3. **Environment variables** configured in `.env` file

## Quick Start with Docker

If you have Docker installed, the easiest way to get started is:

```bash
# Start PostgreSQL and Redis containers
docker-compose up -d

# Wait for services to be healthy (about 10 seconds)
docker-compose ps

# Run migrations
npm run prisma:migrate

# Seed the database
npm run prisma:seed
```

## Manual Setup (Without Docker)

If you prefer to use a local PostgreSQL installation:

### 1. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database and user
CREATE DATABASE sagesure_db;
CREATE USER sagesure WITH PASSWORD 'sagesure_dev_password';
GRANT ALL PRIVILEGES ON DATABASE sagesure_db TO sagesure;

# Exit psql
\q
```

### 2. Configure Environment

Ensure your `.env` file has the correct DATABASE_URL:

```env
DATABASE_URL=postgresql://sagesure:sagesure_dev_password@localhost:5432/sagesure_db
```

### 3. Run Migrations

```bash
# Generate Prisma Client
npm run prisma:generate

# Run all pending migrations
npm run prisma:migrate

# Or deploy migrations without prompts (production)
npm run prisma:migrate:deploy
```

### 4. Seed Database

```bash
# Run seed script
npm run prisma:seed
```

## What Gets Seeded?

The seed script populates the database with:

### ScamShield Module Data

1. **15 Scam Patterns** covering:
   - Policy suspension scams
   - Fake cashback offers
   - Fake claim rejections
   - KYC phishing attempts
   - Agent impersonation
   - Fake regulator notices
   - Digital arrest scams (CRITICAL priority)
   - Advance fee fraud
   - Malware distribution

2. **10 Verified Insurance Brands**:
   - LIC India
   - HDFC Life Insurance
   - ICICI Prudential Life Insurance
   - SBI Life Insurance
   - Max Life Insurance
   - Bajaj Allianz Life Insurance
   - Tata AIA Life Insurance
   - Star Health Insurance
   - HDFC ERGO Health Insurance
   - Care Health Insurance

3. **3 Telemarketer Registry Entries**:
   - 1 verified brand number (LIC)
   - 2 known scammer numbers with report counts

## Migration Details

### Migration: `add_scamshield_and_policy_pulse_tables`

This migration adds the following tables:

**ScamShield Tables:**
- `scam_patterns` - Pattern matching database with full-text search
- `digital_arrest_incidents` - Tracks digital arrest scam incidents
- `telemarketer_registry` - Phone number verification database
- `verified_brands` - Official insurance brand contact information
- `scam_reports` - User-reported scam incidents
- `family_alerts` - Family member alert notifications

**Policy Pulse Tables:**
- `policies` - User insurance policies
- `policy_ontology` - Normalized policy features for comparison
- `policy_translations` - Plain language policy translations
- `red_flags` - Mis-selling indicators
- `coverage_comparisons` - Policy comparison reports

### Key Features

1. **Full-Text Search**: The `scam_patterns` table includes a GIN index on `pattern_text` for fast text search
2. **Foreign Keys**: Proper relationships between policies and related tables with CASCADE deletes
3. **JSONB Fields**: Flexible storage for complex data structures (anomalies, parsed data, etc.)
4. **Timestamps**: All tables include `created_at` and `updated_at` where appropriate

## Verification

After running migrations and seeding, verify the setup:

```bash
# Open Prisma Studio to browse data
npm run prisma:studio

# Or connect via psql
psql -U sagesure -d sagesure_db

# Check table counts
SELECT 'scam_patterns' as table_name, COUNT(*) FROM scam_patterns
UNION ALL
SELECT 'verified_brands', COUNT(*) FROM verified_brands
UNION ALL
SELECT 'telemarketer_registry', COUNT(*) FROM telemarketer_registry;
```

Expected output:
```
    table_name       | count
---------------------+-------
 scam_patterns       |    15
 verified_brands     |    10
 telemarketer_registry|     3
```

## Troubleshooting

### Connection Refused

If you get `Can't reach database server at localhost:5432`:

1. Check if PostgreSQL is running: `docker-compose ps` or `pg_isready`
2. Verify DATABASE_URL in `.env` matches your setup
3. Check firewall settings allowing port 5432

### Migration Already Applied

If you see "Migration already applied":

```bash
# Reset database (WARNING: deletes all data)
npm run prisma:migrate reset

# Or manually drop and recreate
psql -U postgres -c "DROP DATABASE sagesure_db;"
psql -U postgres -c "CREATE DATABASE sagesure_db;"
npm run prisma:migrate
```

### Seed Script Errors

If seeding fails:

1. Ensure migrations ran successfully first
2. Check for unique constraint violations (re-running seed is safe due to upsert)
3. Verify Prisma Client is generated: `npm run prisma:generate`

## Production Deployment

For production environments:

```bash
# Use deploy command (no interactive prompts)
npm run prisma:migrate:deploy

# Optionally seed production data
npm run prisma:seed
```

**Note**: Review seed data before running in production. You may want to:
- Add more scam patterns from real-world data
- Update verified brand contact information
- Remove test/sample data

## Next Steps

After successful migration and seeding:

1. Start the backend server: `npm run dev`
2. Test ScamShield endpoints with seeded scam patterns
3. Verify full-text search on scam patterns
4. Test Policy Pulse with sample policy uploads

## Additional Resources

- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Seeding Guide](https://www.prisma.io/docs/guides/database/seed-database)
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch.html)
