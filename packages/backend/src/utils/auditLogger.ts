import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { logger } from './logger';

const prisma = new PrismaClient();

export interface AuditLogEntry {
  userId?: string;
  actionType: string;
  resourceType?: string;
  resourceId?: string;
  ipAddress?: string;
  userAgent?: string;
  outcome: 'SUCCESS' | 'FAILURE';
  details?: Record<string, any>;
}

/**
 * Creates a cryptographic hash for tamper-proof audit logs
 * Implements Requirement 21.5
 */
function createAuditHash(entry: AuditLogEntry, timestamp: Date): string {
  const data = JSON.stringify({
    ...entry,
    timestamp: timestamp.toISOString(),
  });
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Logs user actions to the audit_trail table with cryptographic hashing
 * Implements Requirements 1.10, 21.1, 21.5
 * 
 * @param entry - Audit log entry containing user action details
 * @returns Promise resolving to the created audit log ID
 */
export async function logAuditTrail(entry: AuditLogEntry): Promise<string> {
  try {
    const timestamp = new Date();
    const auditHash = createAuditHash(entry, timestamp);

    const auditLog = await prisma.auditTrail.create({
      data: {
        userId: entry.userId,
        actionType: entry.actionType,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        outcome: entry.outcome,
        details: entry.details || {},
        hash: auditHash,
        createdAt: timestamp,
      },
    });

    logger.debug('Audit log created', {
      auditId: auditLog.auditId,
      actionType: entry.actionType,
      userId: entry.userId,
    });

    return auditLog.auditId;
  } catch (error) {
    logger.error('Failed to create audit log', {
      error,
      entry,
    });
    throw error;
  }
}

/**
 * Verifies the integrity of an audit log entry
 * Implements Requirement 21.5
 * 
 * @param auditId - ID of the audit log to verify
 * @returns Promise resolving to true if hash is valid, false otherwise
 */
export async function verifyAuditLog(auditId: string): Promise<boolean> {
  try {
    const auditLog = await prisma.auditTrail.findUnique({
      where: { auditId },
    });

    if (!auditLog) {
      return false;
    }

    const entry: AuditLogEntry = {
      userId: auditLog.userId || undefined,
      actionType: auditLog.actionType,
      resourceType: auditLog.resourceType || undefined,
      resourceId: auditLog.resourceId || undefined,
      ipAddress: auditLog.ipAddress || undefined,
      userAgent: auditLog.userAgent || undefined,
      outcome: auditLog.outcome as 'SUCCESS' | 'FAILURE',
      details: auditLog.details as Record<string, any>,
    };

    const expectedHash = createAuditHash(entry, auditLog.createdAt);
    return expectedHash === auditLog.hash;
  } catch (error) {
    logger.error('Failed to verify audit log', {
      error,
      auditId,
    });
    return false;
  }
}

/**
 * Queries audit logs with filtering support
 * Implements Requirement 21.6
 * 
 * @param filters - Optional filters for querying audit logs
 * @returns Promise resolving to array of audit logs
 */
export async function queryAuditLogs(filters?: {
  userId?: string;
  actionType?: string;
  outcome?: 'SUCCESS' | 'FAILURE';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.actionType) {
      where.actionType = filters.actionType;
    }

    if (filters?.outcome) {
      where.outcome = filters.outcome;
    }

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const auditLogs = await prisma.auditTrail.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filters?.limit || 100,
      skip: filters?.offset || 0,
    });

    return auditLogs;
  } catch (error) {
    logger.error('Failed to query audit logs', {
      error,
      filters,
    });
    throw error;
  }
}
