-- AlterTable: Add hash column to audit_trail for tamper-proof logging
-- Implements Requirement 21.5: Store audit logs in tamper-proof format with cryptographic hashing

-- Rename id column to audit_id for consistency
ALTER TABLE "audit_trail" RENAME COLUMN "id" TO "audit_id";

-- Add hash column for cryptographic integrity
ALTER TABLE "audit_trail" ADD COLUMN "hash" VARCHAR(64) NOT NULL DEFAULT '';

-- Update existing records with placeholder hash (will be recalculated on first verification)
UPDATE "audit_trail" SET "hash" = '' WHERE "hash" = '';
