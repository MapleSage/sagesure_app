import { PrismaClient } from '@prisma/client';
import * as coverageComparisonService from './coverageComparison.service';
import * as policyPulseService from './policyPulse.service';

jest.mock('@prisma/client');
jest.mock('./policyPulse.service');

const mockPrisma = {
  policyOntology: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  policy: {
    findMany: jest.fn(),
  },
  coverageComparison: {
    create: jest.fn(),
  },
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(() => mockPrisma as any);

describe('Coverage Comparison Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('normalizePolicyOntology', () => {
    it('should extract coverage features from policy text', async () => {
      const mockPolicy = {
        policyId: 'policy-1',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'TEST123',
          policyType: 'HEALTH',
          issueDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          sumAssured: 500000,
          premium: 15000,
        },
        sections: {
          coverage: 'This policy covers hospitalization, pre-hospitalization, post-hospitalization, day care procedures, ambulance services, health check-ups, maternity benefits, newborn coverage, AYUSH treatments, and mental health services.',
          exclusions: ['Pre-existing diseases', 'Cosmetic surgery'],
          terms: 'Standard terms and conditions apply.',
          conditions: 'General conditions apply.',
        },
        extractedData: {
          waitingPeriods: [
            { condition: 'Initial waiting period', period: '30 days' },
            { condition: 'Pre-existing diseases', period: '4 years' },
            { condition: 'Specific diseases', period: '2 years' },
          ],
          subLimits: [
            { item: 'Room rent', limit: 5000 },
            { item: 'ICU charges', limit: 10000 },
            { item: 'Cataract surgery', limit: 50000 },
          ],
          coPayment: 20,
          roomRentLimit: 5000,
        },
      };

      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.policyOntology.findFirst.mockResolvedValue(null);
      mockPrisma.policyOntology.create.mockResolvedValue({});

      const ontology = await coverageComparisonService.normalizePolicyOntology('policy-1', 'user-1');

      expect(ontology.coverageFeatures.hospitalization).toBe(true);
      expect(ontology.coverageFeatures.preHospitalization).toBe(true);
      expect(ontology.coverageFeatures.postHospitalization).toBe(true);
      expect(ontology.coverageFeatures.dayCare).toBe(true);
      expect(ontology.coverageFeatures.ambulance).toBe(true);
      expect(ontology.coverageFeatures.healthCheckup).toBe(true);
      expect(ontology.coverageFeatures.maternityBenefit).toBe(true);
      expect(ontology.coverageFeatures.newbornCoverage).toBe(true);
      expect(ontology.coverageFeatures.ayush).toBe(true);
      expect(ontology.coverageFeatures.mentalHealth).toBe(true);
      expect(ontology.coverageFeatures.organDonor).toBe(false);
      expect(ontology.coverageFeatures.modernTreatments).toBe(false);
      expect(ontology.coverageFeatures.homeHealthcare).toBe(false);
      expect(ontology.coverageFeatures.airAmbulance).toBe(false);
    });

    it('should convert waiting periods to days correctly', async () => {
      const mockPolicy = {
        policyId: 'policy-1',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'TEST123',
          policyType: 'HEALTH',
          issueDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          sumAssured: 500000,
          premium: 15000,
        },
        sections: {
          coverage: 'Basic coverage',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [
            { condition: 'Initial waiting period', period: '30 days' },
            { condition: 'Pre-existing diseases', period: '3 years' },
            { condition: 'Specific diseases', period: '24 months' },
          ],
          subLimits: [],
          coPayment: null,
          roomRentLimit: null,
        },
      };

      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.policyOntology.findFirst.mockResolvedValue(null);
      mockPrisma.policyOntology.create.mockResolvedValue({});

      const ontology = await coverageComparisonService.normalizePolicyOntology('policy-1', 'user-1');

      expect(ontology.waitingPeriods.initial).toBe(30);
      expect(ontology.waitingPeriods.preExisting).toBe(1095); // 3 years
      expect(ontology.waitingPeriods.specificDiseases).toBe(720); // 24 months
    });

    it('should extract sub-limits correctly', async () => {
      const mockPolicy = {
        policyId: 'policy-1',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'TEST123',
          policyType: 'HEALTH',
          issueDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          sumAssured: 500000,
          premium: 15000,
        },
        sections: {
          coverage: 'Basic coverage',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [
            { item: 'Room rent', limit: 5000 },
            { item: 'ICU charges', limit: 10000 },
            { item: 'Critical illness', limit: 100000 },
            { item: 'Cataract surgery', limit: 50000 },
            { item: 'Knee replacement', limit: 150000 },
          ],
          coPayment: 20,
          roomRentLimit: 5000,
        },
      };

      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockPolicy);
      mockPrisma.policyOntology.findFirst.mockResolvedValue(null);
      mockPrisma.policyOntology.create.mockResolvedValue({});

      const ontology = await coverageComparisonService.normalizePolicyOntology('policy-1', 'user-1');

      expect(ontology.subLimits.roomRent).toBe(5000);
      expect(ontology.subLimits.icuCharges).toBe(10000);
      expect(ontology.subLimits.criticalIllness).toBe(100000);
      expect(ontology.subLimits.cataract).toBe(50000);
      expect(ontology.subLimits.jointReplacement).toBe(150000);
    });

    it('should throw error when policy not found', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(null);

      await expect(
        coverageComparisonService.normalizePolicyOntology('invalid-policy', 'user-1')
      ).rejects.toThrow('Failed to normalize policy ontology');
    });
  });

  describe('findSimilarPolicies', () => {
    it('should find policies with similar sum assured', async () => {
      const mockUserPolicy = {
        policyId: 'policy-1',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'TEST123',
          policyType: 'HEALTH',
          issueDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          sumAssured: 500000,
          premium: 15000,
        },
        sections: {
          coverage: 'Basic coverage',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: null,
          roomRentLimit: null,
        },
      };

      const mockSimilarPolicies = [
        {
          id: 'policy-2',
          userId: 'user-2',
          insurerName: 'Another Insurance',
          policyNumber: 'ANO456',
          policyType: 'HEALTH',
          sumAssured: 480000,
          premium: 14000,
          createdAt: new Date(),
        },
        {
          id: 'policy-3',
          userId: 'user-3',
          insurerName: 'Third Insurance',
          policyNumber: 'THI789',
          policyType: 'HEALTH',
          sumAssured: 520000,
          premium: 16000,
          createdAt: new Date(),
        },
      ];

      const mockOntology = {
        id: 'ont-1',
        policyId: 'policy-2',
        coverageFeatures: {},
        exclusions: [],
        waitingPeriods: {},
        subLimits: {},
        coPayment: null,
        roomRentLimit: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockUserPolicy);
      mockPrisma.policy.findMany.mockResolvedValue(mockSimilarPolicies);
      mockPrisma.policyOntology.findFirst.mockResolvedValue(mockOntology);

      const similarPolicies = await coverageComparisonService.findSimilarPolicies('policy-1', 'user-1', 5);

      expect(mockPrisma.policy.findMany).toHaveBeenCalledWith({
        where: {
          id: { not: 'policy-1' },
          policyType: 'HEALTH',
          sumAssured: {
            gte: 400000, // 80% of 500000
            lte: 600000, // 120% of 500000
          },
        },
        take: 5,
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(similarPolicies.length).toBeGreaterThan(0);
    });

    it('should throw error when user policy not found', async () => {
      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(null);

      await expect(
        coverageComparisonService.findSimilarPolicies('invalid-policy', 'user-1')
      ).rejects.toThrow('Failed to find similar policies');
    });
  });

  describe('comparePolices', () => {
    it('should generate comparison report with coverage gaps', async () => {
      const mockUserPolicy = {
        policyId: 'policy-1',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'TEST123',
          policyType: 'HEALTH',
          issueDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          sumAssured: 500000,
          premium: 20000, // High premium
        },
        sections: {
          coverage: 'Basic hospitalization coverage',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [
            { condition: 'Pre-existing', period: '4 years' },
          ],
          subLimits: [],
          coPayment: 20,
          roomRentLimit: 5000,
        },
      };

      const mockSimilarPolicies = [
        {
          policyId: 'policy-2',
          insurerName: 'Better Insurance',
          policyNumber: 'BET456',
          policyType: 'HEALTH',
          sumAssured: 500000,
          premium: 15000,
          ontology: {
            policyId: 'policy-2',
            coverageFeatures: {
              hospitalization: true,
              preHospitalization: true,
              postHospitalization: true,
              dayCare: true,
              ambulance: true,
              healthCheckup: true,
              maternityBenefit: false,
              newbornCoverage: false,
              organDonor: false,
              modernTreatments: false,
              ayush: false,
              mentalHealth: false,
              homeHealthcare: false,
              airAmbulance: false,
            },
            exclusions: [],
            waitingPeriods: {
              initial: 30,
              preExisting: 1095,
              specificDiseases: 730,
            },
            subLimits: {
              roomRent: 5000,
              icuCharges: null,
              criticalIllness: null,
              cataract: null,
              jointReplacement: null,
            },
            coPayment: 15,
            claimSettlementRatio: null,
          },
        },
      ];

      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockUserPolicy);
      mockPrisma.policyOntology.findFirst.mockResolvedValue(null);
      mockPrisma.policyOntology.create.mockResolvedValue({});
      mockPrisma.policy.findMany.mockResolvedValue([
        {
          id: 'policy-2',
          userId: 'user-2',
          insurerName: 'Better Insurance',
          policyNumber: 'BET456',
          policyType: 'HEALTH',
          sumAssured: 500000,
          premium: 15000,
          createdAt: new Date(),
        },
      ]);
      mockPrisma.policyOntology.findFirst
        .mockResolvedValueOnce(null) // For user policy
        .mockResolvedValueOnce({
          id: 'ont-2',
          policyId: 'policy-2',
          coverageFeatures: mockSimilarPolicies[0].ontology.coverageFeatures,
          exclusions: [],
          waitingPeriods: mockSimilarPolicies[0].ontology.waitingPeriods,
          subLimits: mockSimilarPolicies[0].ontology.subLimits,
          coPayment: 15,
          roomRentLimit: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      mockPrisma.coverageComparison.create.mockResolvedValue({});

      const report = await coverageComparisonService.comparePolices('policy-1', 'user-1');

      expect(report.userPolicy.policyId).toBe('policy-1');
      expect(report.similarPolicies.length).toBeGreaterThan(0);
      expect(report.comparison.coverageGaps.length).toBeGreaterThan(0);
      expect(report.comparison.coverageGaps).toContain('Pre Hospitalization');
      expect(report.comparison.coverageGaps).toContain('Post Hospitalization');
      expect(report.switchingRecommendation.shouldSwitch).toBe(true);
    });

    it('should recommend not switching when policy is competitive', async () => {
      const mockUserPolicy = {
        policyId: 'policy-1',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'TEST123',
          policyType: 'HEALTH',
          issueDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          sumAssured: 500000,
          premium: 15000,
        },
        sections: {
          coverage: 'Comprehensive coverage',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: 20,
          roomRentLimit: 5000,
        },
      };

      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockUserPolicy);
      mockPrisma.policyOntology.findFirst.mockResolvedValue(null);
      mockPrisma.policyOntology.create.mockResolvedValue({});
      mockPrisma.policy.findMany.mockResolvedValue([
        {
          id: 'policy-2',
          userId: 'user-2',
          insurerName: 'Similar Insurance',
          policyNumber: 'SIM456',
          policyType: 'HEALTH',
          sumAssured: 500000,
          premium: 15500,
          createdAt: new Date(),
        },
      ]);
      mockPrisma.policyOntology.findFirst
        .mockResolvedValueOnce(null) // For user policy
        .mockResolvedValueOnce({
          id: 'ont-2',
          policyId: 'policy-2',
          coverageFeatures: {
            hospitalization: true,
            preHospitalization: true,
            postHospitalization: true,
            dayCare: true,
            ambulance: true,
            healthCheckup: true,
            maternityBenefit: true,
            newbornCoverage: true,
            organDonor: false,
            modernTreatments: false,
            ayush: false,
            mentalHealth: false,
            homeHealthcare: false,
            airAmbulance: false,
          },
          exclusions: [],
          waitingPeriods: {
            initial: 30,
            preExisting: 1095,
            specificDiseases: 730,
          },
          subLimits: {
            roomRent: 5000,
            icuCharges: null,
            criticalIllness: null,
            cataract: null,
            jointReplacement: null,
          },
          coPayment: 20,
          roomRentLimit: 5000,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      mockPrisma.coverageComparison.create.mockResolvedValue({});

      const report = await coverageComparisonService.comparePolices('policy-1', 'user-1');

      expect(report.switchingRecommendation.shouldSwitch).toBe(false);
      expect(report.switchingRecommendation.reason).toContain('competitive');
    });

    it('should throw error when no similar policies found', async () => {
      const mockUserPolicy = {
        policyId: 'policy-1',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'TEST123',
          policyType: 'HEALTH',
          issueDate: new Date('2024-01-01'),
          expiryDate: new Date('2025-01-01'),
          sumAssured: 500000,
          premium: 15000,
        },
        sections: {
          coverage: 'Basic coverage',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: null,
          roomRentLimit: null,
        },
      };

      (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockUserPolicy);
      mockPrisma.policyOntology.findFirst.mockResolvedValue(null);
      mockPrisma.policyOntology.create.mockResolvedValue({});
      // Return empty array for similar policies
      mockPrisma.policy.findMany.mockResolvedValue([]);

      await expect(
        coverageComparisonService.comparePolices('policy-1', 'user-1')
      ).rejects.toThrow();
    });
  });
});
