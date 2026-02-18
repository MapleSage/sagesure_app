import * as fc from 'fast-check';
import { PrismaClient } from '@prisma/client';
import * as redFlagService from './redFlag.service';
import * as policyPulseService from './policyPulse.service';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../utils/logger');
jest.mock('./policyPulse.service');

const mockPrisma = {
  redFlag: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
  () => mockPrisma as any
);

/**
 * Property 11: Red flag detection completeness
 * For any policy, all 8+ rules should be evaluated
 */
describe('Property 11: Red Flag Detection Completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.redFlag.createMany.mockResolvedValue({ count: 0 });
  });

  // Arbitrary for generating policy data
  const policyArbitrary = fc.record({
    policyId: fc.uuid(),
    userId: fc.uuid(),
    metadata: fc.record({
      insurerName: fc.string({ minLength: 1, maxLength: 50 }),
      policyNumber: fc.string({ minLength: 5, maxLength: 20 }),
      issueDate: fc.date({ min: new Date('2020-01-01'), max: new Date('2024-01-01') }),
      expiryDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2030-01-01') }),
      sumAssured: fc.integer({ min: 100000, max: 10000000 }),
      premium: fc.integer({ min: 5000, max: 500000 }),
    }),
    sections: fc.record({
      coverage: fc.string({ minLength: 10, maxLength: 500 }),
      exclusions: fc.array(fc.string({ minLength: 5, maxLength: 100 }), { minLength: 0, maxLength: 30 }),
      terms: fc.string({ minLength: 10, maxLength: 500 }),
      conditions: fc.string({ minLength: 10, maxLength: 500 }),
    }),
    extractedData: fc.record({
      waitingPeriods: fc.array(
        fc.record({
          condition: fc.string({ minLength: 5, maxLength: 50 }),
          period: fc.oneof(
            fc.constant('1 year'),
            fc.constant('2 years'),
            fc.constant('3 years'),
            fc.constant('4 years'),
            fc.constant('5 years'),
            fc.constant('6 years')
          ),
        }),
        { minLength: 0, maxLength: 5 }
      ),
      subLimits: fc.array(
        fc.record({
          item: fc.oneof(
            fc.constant('Critical illness'),
            fc.constant('Cancer treatment'),
            fc.constant('Heart surgery'),
            fc.constant('Kidney transplant'),
            fc.constant('General treatment')
          ),
          limit: fc.integer({ min: 10000, max: 1000000 }),
        }),
        { minLength: 0, maxLength: 10 }
      ),
      coPayment: fc.oneof(fc.constant(null), fc.integer({ min: 0, max: 100 })),
      roomRentLimit: fc.oneof(fc.constant(null), fc.integer({ min: 500, max: 20000 })),
    }),
  });

  it('should evaluate all red flag rules for any policy', async () => {
    await fc.assert(
      fc.asyncProperty(policyArbitrary, async (policy) => {
        (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(policy);

        const report = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

        // Verify report structure
        expect(report).toHaveProperty('policyId');
        expect(report).toHaveProperty('overallRisk');
        expect(report).toHaveProperty('redFlags');
        expect(report).toHaveProperty('recommendations');
        expect(report).toHaveProperty('misSellingSuspicion');
        expect(report).toHaveProperty('analysisDate');

        // Verify overallRisk is valid
        expect(['LOW', 'MEDIUM', 'HIGH']).toContain(report.overallRisk);

        // Verify all red flags have required properties
        report.redFlags.forEach((flag) => {
          expect(flag).toHaveProperty('type');
          expect(flag).toHaveProperty('severity');
          expect(flag).toHaveProperty('description');
          expect(flag).toHaveProperty('policyClause');
          expect(flag).toHaveProperty('recommendation');
          expect(['LOW', 'MEDIUM', 'HIGH']).toContain(flag.severity);
        });

        // Verify mis-selling suspicion logic
        if (report.redFlags.length > 3) {
          expect(report.misSellingSuspicion).toBe(true);
        } else {
          expect(report.misSellingSuspicion).toBe(false);
        }

        // Verify recommendations are provided
        expect(Array.isArray(report.recommendations)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it('should calculate consistent risk levels based on flag severity', async () => {
    await fc.assert(
      fc.asyncProperty(policyArbitrary, async (policy) => {
        (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(policy);

        const report = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

        const highSeverityCount = report.redFlags.filter((f) => f.severity === 'HIGH').length;
        const mediumSeverityCount = report.redFlags.filter((f) => f.severity === 'MEDIUM').length;
        const totalFlags = report.redFlags.length;

        // Verify risk calculation logic
        if (highSeverityCount >= 2 || totalFlags >= 5) {
          expect(report.overallRisk).toBe('HIGH');
        } else if (highSeverityCount >= 1 || mediumSeverityCount >= 2 || totalFlags >= 3) {
          expect(report.overallRisk).toBe('MEDIUM');
        } else {
          expect(report.overallRisk).toBe('LOW');
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should detect excessive exclusions when count > 15', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 16, max: 30 }),
        policyArbitrary,
        async (exclusionCount, policy) => {
          const policyWithExclusions = {
            ...policy,
            sections: {
              ...policy.sections,
              exclusions: Array(exclusionCount).fill('Exclusion'),
            },
          };

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(
            policyWithExclusions
          );

          const report = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

          const hasExcessiveExclusionsFlag = report.redFlags.some(
            (flag) => flag.type === 'EXCESSIVE_EXCLUSIONS'
          );
          expect(hasExcessiveExclusionsFlag).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect long waiting periods when > 4 years', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(fc.constant('5 years'), fc.constant('6 years'), fc.constant('7 years')),
        policyArbitrary,
        async (waitingPeriod, policy) => {
          const policyWithLongWaiting = {
            ...policy,
            extractedData: {
              ...policy.extractedData,
              waitingPeriods: [
                { condition: 'Pre-existing conditions', period: waitingPeriod },
              ],
            },
          };

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(
            policyWithLongWaiting
          );

          const report = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

          const hasLongWaitingFlag = report.redFlags.some(
            (flag) => flag.type === 'LONG_WAITING_PERIOD'
          );
          expect(hasLongWaitingFlag).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect low sub-limits for critical illness when < 30% of sum assured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100000, max: 1000000 }),
        fc.float({ min: 0.05, max: 0.29 }),
        policyArbitrary,
        async (sumAssured, percentage, policy) => {
          const subLimit = Math.floor(sumAssured * percentage);
          const policyWithLowSubLimits = {
            ...policy,
            metadata: {
              ...policy.metadata,
              sumAssured,
            },
            extractedData: {
              ...policy.extractedData,
              subLimits: [{ item: 'Critical illness', limit: subLimit }],
            },
          };

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(
            policyWithLowSubLimits
          );

          const report = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

          const hasLowSubLimitsFlag = report.redFlags.some(
            (flag) => flag.type === 'LOW_SUB_LIMITS'
          );
          expect(hasLowSubLimitsFlag).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect high premium when > 4% of sum assured', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100000, max: 1000000 }),
        fc.float({ min: 0.041, max: 0.1 }),
        policyArbitrary,
        async (sumAssured, percentage, policy) => {
          const premium = Math.floor(sumAssured * percentage);
          const policyWithHighPremium = {
            ...policy,
            metadata: {
              ...policy.metadata,
              sumAssured,
              premium,
            },
          };

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(
            policyWithHighPremium
          );

          const report = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

          const hasHighPremiumFlag = report.redFlags.some(
            (flag) => flag.type === 'HIGH_PREMIUM'
          );
          expect(hasHighPremiumFlag).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect high co-payment when > 30%', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 31, max: 100 }),
        policyArbitrary,
        async (coPayment, policy) => {
          const policyWithHighCoPayment = {
            ...policy,
            extractedData: {
              ...policy.extractedData,
              coPayment,
            },
          };

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(
            policyWithHighCoPayment
          );

          const report = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

          const hasHighCoPaymentFlag = report.redFlags.some(
            (flag) => flag.type === 'HIGH_COPAYMENT'
          );
          expect(hasHighCoPaymentFlag).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should detect low room rent when < 1% of sum assured per day', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 100000, max: 1000000 }),
        fc.float({ min: 0.001, max: 0.0099 }),
        policyArbitrary,
        async (sumAssured, percentage, policy) => {
          const roomRentLimit = Math.floor(sumAssured * percentage);
          const policyWithLowRoomRent = {
            ...policy,
            metadata: {
              ...policy.metadata,
              sumAssured,
            },
            extractedData: {
              ...policy.extractedData,
              roomRentLimit,
            },
          };

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(
            policyWithLowRoomRent
          );

          const report = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

          const hasLowRoomRentFlag = report.redFlags.some(
            (flag) => flag.type === 'LOW_ROOM_RENT'
          );
          expect(hasLowRoomRentFlag).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should store red flags in database for any policy', async () => {
    await fc.assert(
      fc.asyncProperty(policyArbitrary, async (policy) => {
        (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(policy);

        await redFlagService.detectRedFlags(policy.policyId, policy.userId);

        // Verify database operations were called
        expect(mockPrisma.redFlag.deleteMany).toHaveBeenCalledWith({
          where: { policyId: policy.policyId },
        });

        // If red flags were detected, createMany should be called
        const createManyCall = mockPrisma.redFlag.createMany.mock.calls[0];
        if (createManyCall) {
          const data = createManyCall[0].data;
          expect(Array.isArray(data)).toBe(true);
          data.forEach((flag: any) => {
            expect(flag).toHaveProperty('policyId');
            expect(flag).toHaveProperty('flagType');
            expect(flag).toHaveProperty('severity');
            expect(flag).toHaveProperty('description');
            expect(flag).toHaveProperty('policyClause');
            expect(flag).toHaveProperty('recommendation');
          });
        }
      }),
      { numRuns: 100 }
    );
  });

  it('should return consistent results for the same policy', async () => {
    await fc.assert(
      fc.asyncProperty(policyArbitrary, async (policy) => {
        (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(policy);

        const report1 = await redFlagService.detectRedFlags(policy.policyId, policy.userId);
        const report2 = await redFlagService.detectRedFlags(policy.policyId, policy.userId);

        // Results should be identical for the same policy
        expect(report1.overallRisk).toBe(report2.overallRisk);
        expect(report1.redFlags.length).toBe(report2.redFlags.length);
        expect(report1.misSellingSuspicion).toBe(report2.misSellingSuspicion);
      }),
      { numRuns: 50 }
    );
  });
});
