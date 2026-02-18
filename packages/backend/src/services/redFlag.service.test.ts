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

describe('RedFlag Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectRedFlags', () => {
    const mockPolicy: policyPulseService.ParsedPolicy = {
      policyId: 'policy-123',
      userId: 'user-123',
      metadata: {
        insurerName: 'Test Insurer',
        policyNumber: 'POL123',
        issueDate: new Date('2024-01-01'),
        expiryDate: new Date('2025-01-01'),
        sumAssured: 500000,
        premium: 25000,
      },
      sections: {
        coverage: 'Test coverage',
        exclusions: Array(20).fill('Exclusion'),
        terms: 'Test terms',
        conditions: 'Test conditions',
      },
      extractedData: {
        waitingPeriods: [
          { condition: 'Pre-existing conditions', period: '5 years' },
        ],
        subLimits: [
          { item: 'Critical illness', limit: 100000 },
        ],
        coPayment: 40,
        roomRentLimit: 2000,
      },
    };

    it('should detect excessive exclusions', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.redFlags).toContainEqual(
        expect.objectContaining({
          type: 'EXCESSIVE_EXCLUSIONS',
          severity: 'LOW',
        })
      );
    });

    it('should detect long waiting periods', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.redFlags).toContainEqual(
        expect.objectContaining({
          type: 'LONG_WAITING_PERIOD',
          severity: 'LOW',
        })
      );
    });

    it('should detect low sub-limits for critical illness', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.redFlags).toContainEqual(
        expect.objectContaining({
          type: 'LOW_SUB_LIMITS',
          severity: 'HIGH',
        })
      );
    });

    it('should detect high premium', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.redFlags).toContainEqual(
        expect.objectContaining({
          type: 'HIGH_PREMIUM',
          severity: 'MEDIUM',
        })
      );
    });

    it('should detect high co-payment', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.redFlags).toContainEqual(
        expect.objectContaining({
          type: 'HIGH_COPAYMENT',
          severity: 'MEDIUM',
        })
      );
    });

    it('should detect low room rent limits', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.redFlags).toContainEqual(
        expect.objectContaining({
          type: 'LOW_ROOM_RENT',
          severity: 'HIGH',
        })
      );
    });

    it('should detect missing commission disclosure', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.redFlags).toContainEqual(
        expect.objectContaining({
          type: 'MISSING_COMMISSION',
          severity: 'LOW',
        })
      );
    });

    it('should calculate HIGH overall risk when multiple high-severity flags', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.overallRisk).toBe('HIGH');
    });

    it('should flag mis-selling suspicion when >3 red flags', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.misSellingSuspicion).toBe(true);
      expect(report.recommendations).toContain(
        expect.stringContaining('mis-selling')
      );
    });

    it('should provide recommendations for HIGH risk policies', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 1 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should store red flags in database', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 7 });

      await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(mockPrisma.redFlag.deleteMany).toHaveBeenCalledWith({
        where: { policyId: 'policy-123' },
      });
      expect(mockPrisma.redFlag.createMany).toHaveBeenCalled();
    });

    it('should handle policy not found', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(null);

      await expect(
        redFlagService.detectRedFlags('policy-123', 'user-123')
      ).rejects.toThrow('Policy not found');
    });

    it('should calculate LOW risk when no red flags', async () => {
      const cleanPolicy: policyPulseService.ParsedPolicy = {
        ...mockPolicy,
        sections: {
          ...mockPolicy.sections,
          exclusions: ['Exclusion 1', 'Exclusion 2'],
          terms: 'Terms with commission disclosure',
        },
        extractedData: {
          waitingPeriods: [{ condition: 'Pre-existing', period: '2 years' }],
          subLimits: [{ item: 'Critical illness', limit: 200000 }],
          coPayment: 10,
          roomRentLimit: 8000,
        },
        metadata: {
          ...mockPolicy.metadata,
          premium: 10000,
        },
      };

      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(cleanPolicy);
      mockPrisma.redFlag.deleteMany.mockResolvedValue({ count: 0 });
      mockPrisma.redFlag.createMany.mockResolvedValue({ count: 0 });

      const report = await redFlagService.detectRedFlags('policy-123', 'user-123');

      expect(report.overallRisk).toBe('LOW');
      expect(report.misSellingSuspicion).toBe(false);
    });
  });

  describe('getRedFlagReport', () => {
    it('should retrieve existing red flag report from database', async () => {
      const mockRedFlags = [
        {
          id: 'flag-1',
          policyId: 'policy-123',
          flagType: 'HIGH_PREMIUM',
          severity: 'MEDIUM',
          description: 'Premium is high',
          policyClause: 'Premium Details',
          recommendation: 'Compare with other policies',
          detectedAt: new Date(),
        },
        {
          id: 'flag-2',
          policyId: 'policy-123',
          flagType: 'HIGH_COPAYMENT',
          severity: 'HIGH',
          description: 'Co-payment is 40%',
          policyClause: 'Co-payment Clause',
          recommendation: 'Look for lower co-payment',
          detectedAt: new Date(),
        },
      ];

      mockPrisma.redFlag.findMany.mockResolvedValue(mockRedFlags);

      const report = await redFlagService.getRedFlagReport('policy-123', 'user-123');

      expect(report).not.toBeNull();
      expect(report?.redFlags).toHaveLength(2);
      expect(report?.overallRisk).toBe('LOW');
    });

    it('should return null when no red flags found', async () => {
      mockPrisma.redFlag.findMany.mockResolvedValue([]);

      const report = await redFlagService.getRedFlagReport('policy-123', 'user-123');

      expect(report).toBeNull();
    });

    it('should calculate MEDIUM risk correctly', async () => {
      const mockRedFlags = [
        {
          id: 'flag-1',
          policyId: 'policy-123',
          flagType: 'HIGH_PREMIUM',
          severity: 'HIGH',
          description: 'Premium is high',
          policyClause: 'Premium Details',
          recommendation: 'Compare with other policies',
          detectedAt: new Date(),
        },
      ];

      mockPrisma.redFlag.findMany.mockResolvedValue(mockRedFlags);

      const report = await redFlagService.getRedFlagReport('policy-123', 'user-123');

      expect(report?.overallRisk).toBe('MEDIUM');
    });

    it('should calculate HIGH risk correctly', async () => {
      const mockRedFlags = Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `flag-${i}`,
          policyId: 'policy-123',
          flagType: 'HIGH_PREMIUM',
          severity: 'MEDIUM',
          description: 'Issue',
          policyClause: 'Clause',
          recommendation: 'Fix',
          detectedAt: new Date(),
        }));

      mockPrisma.redFlag.findMany.mockResolvedValue(mockRedFlags);

      const report = await redFlagService.getRedFlagReport('policy-123', 'user-123');

      expect(report?.overallRisk).toBe('HIGH');
    });
  });
});
