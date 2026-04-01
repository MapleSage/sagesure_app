/**
 * ScamShield Service Property-Based Tests
 * Tests universal properties that should hold for all inputs
 *
 * **Validates: Requirements 3.1, 3.2**
 */

import * as fc from 'fast-check';
import { ScamShieldService } from './scamshield.service';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    scamPattern: {
      count: jest.fn().mockResolvedValue(3),
      createMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  };
  return { PrismaClient: jest.fn(() => mockPrisma) };
});

// Mock logger
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

const scamShieldService = new ScamShieldService();

// Arbitraries for generating test data
const messageArbitrary = fc.string({ minLength: 1, maxLength: 1000 });
const userIdArbitrary = fc.uuid();

describe('ScamShield Service - Property-Based Tests', () => {
  /**
   * Property 6: Scam detection performance bounds
   * For any message, analysis should complete within 2 seconds
   *
   * **Validates: Requirements 3.1**
   */
  describe('Property 6: Scam detection performance bounds', () => {
    it('should analyze any message within 2 seconds', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const startTime = Date.now();

          await scamShieldService.analyzeMessage(message, userId);

          const duration = Date.now() - startTime;
          expect(duration).toBeLessThan(2000);
        }),
        { numRuns: 100 }
      );
    }, 120000);
  });

  /**
   * Property 7: Risk score validity
   * For any analysis, risk score should be 0-100
   *
   * **Validates: Requirements 3.2**
   */
  describe('Property 7: Risk score validity', () => {
    it('should always return risk score between 0 and 100', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);

          expect(analysis.riskScore).toBeGreaterThanOrEqual(0);
          expect(analysis.riskScore).toBeLessThanOrEqual(100);
          expect(typeof analysis.riskScore).toBe('number');
          expect(Number.isFinite(analysis.riskScore)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should set isScam flag correctly based on risk score', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);

          if (analysis.riskScore > 70) {
            expect(analysis.isScam).toBe(true);
          } else {
            expect(analysis.isScam).toBe(false);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should return valid confidence score between 0 and 100', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);

          expect(analysis.confidence).toBeGreaterThanOrEqual(0);
          expect(analysis.confidence).toBeLessThanOrEqual(100);
          expect(Number.isFinite(analysis.confidence)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should always return analysis with required fields', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);

          expect(analysis).toHaveProperty('riskScore');
          expect(analysis).toHaveProperty('isScam');
          expect(analysis).toHaveProperty('matchedPatterns');
          expect(analysis).toHaveProperty('warnings');
          expect(analysis).toHaveProperty('recommendations');
          expect(analysis).toHaveProperty('confidence');
          expect(Array.isArray(analysis.matchedPatterns)).toBe(true);
          expect(Array.isArray(analysis.warnings)).toBe(true);
          expect(Array.isArray(analysis.recommendations)).toBe(true);
          expect(analysis.recommendations.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
