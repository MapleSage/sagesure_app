import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import { logAuditTrail, verifyAuditLog, queryAuditLogs, AuditLogEntry } from './auditLogger';

const prisma = new PrismaClient();

// Test helpers
const auditLogEntryArbitrary = fc.record({
  userId: fc.option(fc.uuid(), { nil: undefined }),
  actionType: fc.constantFrom('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW'),
  resourceType: fc.option(fc.constantFrom('USER', 'POLICY', 'DOCUMENT', 'CLAIM'), { nil: undefined }),
  resourceId: fc.option(fc.uuid(), { nil: undefined }),
  ipAddress: fc.option(fc.ipV4(), { nil: undefined }),
  userAgent: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
  outcome: fc.constantFrom('SUCCESS', 'FAILURE') as fc.Arbitrary<'SUCCESS' | 'FAILURE'>,
  details: fc.option(fc.dictionary(fc.string(), fc.anything()), { nil: undefined }),
});

describe('Audit Logger - Property Tests', () => {
  beforeAll(async () => {
    // Clean up test data
    await prisma.auditTrail.deleteMany({
      where: {
        actionType: {
          in: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW'],
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.auditTrail.deleteMany({
      where: {
        actionType: {
          in: ['LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'VIEW'],
        },
      },
    });
    await prisma.$disconnect();
  });

  /**
   * Property 23: Audit log completeness
   * **Validates: Requirements 21.1**
   * 
   * For any user action, audit log should be created with all required fields
   */
  test('Property 23: Audit log completeness - all required fields are present', async () => {
    await fc.assert(
      fc.asyncProperty(auditLogEntryArbitrary, async (entry) => {
        // Create audit log
        const auditId = await logAuditTrail(entry);

        // Retrieve the created log
        const auditLog = await prisma.auditTrail.findUnique({
          where: { auditId },
        });

        // Verify all required fields are present
        expect(auditLog).toBeDefined();
        expect(auditLog?.auditId).toBe(auditId);
        expect(auditLog?.actionType).toBe(entry.actionType);
        expect(auditLog?.outcome).toBe(entry.outcome);
        expect(auditLog?.createdAt).toBeInstanceOf(Date);
        expect(auditLog?.hash).toBeDefined();
        expect(auditLog?.hash).toHaveLength(64); // SHA-256 hash is 64 hex characters

        // Verify optional fields match if provided
        if (entry.userId) {
          expect(auditLog?.userId).toBe(entry.userId);
        }
        if (entry.resourceType) {
          expect(auditLog?.resourceType).toBe(entry.resourceType);
        }
        if (entry.resourceId) {
          expect(auditLog?.resourceId).toBe(entry.resourceId);
        }
        if (entry.ipAddress) {
          expect(auditLog?.ipAddress).toBe(entry.ipAddress);
        }

        // Clean up
        await prisma.auditTrail.delete({ where: { auditId } });
      }),
      { numRuns: 100 } // Run 100 random test cases
    );
  }, 60000); // 60 second timeout for property test

  /**
   * Property 24: Audit log immutability
   * **Validates: Requirements 21.5**
   * 
   * For any audit log entry, modification attempts should fail
   * and the cryptographic hash should detect tampering
   */
  test('Property 24: Audit log immutability - hash detects tampering', async () => {
    await fc.assert(
      fc.asyncProperty(
        auditLogEntryArbitrary,
        fc.string({ minLength: 1, maxLength: 100 }),
        async (entry, tamperValue) => {
          // Create audit log
          const auditId = await logAuditTrail(entry);

          // Verify original log is valid
          const isValidBefore = await verifyAuditLog(auditId);
          expect(isValidBefore).toBe(true);

          // Attempt to tamper with the log (directly in database)
          await prisma.auditTrail.update({
            where: { auditId },
            data: {
              details: { tampered: tamperValue },
            },
          });

          // Verify tampered log is detected as invalid
          const isValidAfter = await verifyAuditLog(auditId);
          expect(isValidAfter).toBe(false);

          // Clean up
          await prisma.auditTrail.delete({ where: { auditId } });
        }
      ),
      { numRuns: 100 }
    );
  }, 60000);

  /**
   * Additional test: Audit log query filtering
   * Verifies that queryAuditLogs correctly filters by various criteria
   */
  test('Audit log query filtering works correctly', async () => {
    // Create multiple audit logs with different properties
    const userId1 = fc.sample(fc.uuid(), 1)[0];
    const userId2 = fc.sample(fc.uuid(), 1)[0];

    const log1 = await logAuditTrail({
      userId: userId1,
      actionType: 'LOGIN',
      outcome: 'SUCCESS',
    });

    const log2 = await logAuditTrail({
      userId: userId2,
      actionType: 'LOGOUT',
      outcome: 'SUCCESS',
    });

    const log3 = await logAuditTrail({
      userId: userId1,
      actionType: 'CREATE',
      outcome: 'FAILURE',
    });

    // Query by userId
    const userLogs = await queryAuditLogs({ userId: userId1 });
    expect(userLogs.length).toBeGreaterThanOrEqual(2);
    expect(userLogs.every((log) => log.userId === userId1)).toBe(true);

    // Query by actionType
    const loginLogs = await queryAuditLogs({ actionType: 'LOGIN' });
    expect(loginLogs.length).toBeGreaterThanOrEqual(1);
    expect(loginLogs.every((log) => log.actionType === 'LOGIN')).toBe(true);

    // Query by outcome
    const failureLogs = await queryAuditLogs({ outcome: 'FAILURE' });
    expect(failureLogs.length).toBeGreaterThanOrEqual(1);
    expect(failureLogs.every((log) => log.outcome === 'FAILURE')).toBe(true);

    // Clean up
    await prisma.auditTrail.deleteMany({
      where: {
        auditId: { in: [log1, log2, log3] },
      },
    });
  });
});
