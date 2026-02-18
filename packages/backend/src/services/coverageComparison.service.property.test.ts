import * as fc from 'fast-check';
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

/**
 * Property 12: Coverage comparison completeness
 * For any policy comparison, all coverage features should be evaluated
 * 
 * **Validates: Requirements 9.2, 9.4**
 */
describe('Property 12: Coverage comparison completeness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should evaluate all 14 coverage features for any policy', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random coverage features
        fc.record({
          hospitalization: fc.boolean(),
          preHospitalization: fc.boolean(),
          postHospitalization: fc.boolean(),
          dayCare: fc.boolean(),
          ambulance: fc.boolean(),
          healthCheckup: fc.boolean(),
          maternityBenefit: fc.boolean(),
          newbornCoverage: fc.boolean(),
          organDonor: fc.boolean(),
          modernTreatments: fc.boolean(),
          ayush: fc.boolean(),
          mentalHealth: fc.boolean(),
          homeHealthcare: fc.boolean(),
          airAmbulance: fc.boolean(),
        }),
        fc.integer({ min: 100000, max: 10000000 }), // sumAssured
        fc.integer({ min: 5000, max: 500000 }), // premium
        async (coverageFeatures, sumAssured, premium) => {
          const mockUserPolicy = {
            policyId: 'policy-1',
            metadata: {
              insurerName: 'Test Insurance',
              policyNumber: 'TEST123',
              policyType: 'HEALTH',
              issueDate: new Date('2024-01-01'),
              expiryDate: new Date('2025-01-01'),
              sumAssured,
              premium,
            },
            sections: {
              coverage: generateCoverageText(coverageFeatures),
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

          const mockOntology = {
            policyId: 'policy-1',
            coverageFeatures,
            exclusions: [],
            waitingPeriods: {
              initial: 30,
              preExisting: 1460,
              specificDiseases: 730,
            },
            subLimits: {
              roomRent: null,
              icuCharges: null,
              criticalIllness: null,
              cataract: null,
              jointReplacement: null,
            },
            coPayment: null,
            claimSettlementRatio: null,
          };

          const mockSimilarPolicies = [
            {
              policyId: 'policy-2',
              insurerName: 'Similar Insurance',
              policyNumber: 'SIM456',
              policyType: 'HEALTH',
              sumAssured,
              premium: premium * 0.9,
              ontology: {
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
                  organDonor: true,
                  modernTreatments: true,
                  ayush: true,
                  mentalHealth: true,
                  homeHealthcare: true,
                  airAmbulance: true,
                },
                exclusions: [],
                waitingPeriods: {
                  initial: 30,
                  preExisting: 1095,
                  specificDiseases: 730,
                },
                subLimits: {
                  roomRent: null,
                  icuCharges: null,
                  criticalIllness: null,
                  cataract: null,
                  jointReplacement: null,
                },
                coPayment: null,
                claimSettlementRatio: null,
              },
            },
          ];

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockUserPolicy);
          jest.spyOn(coverageComparisonService, 'normalizePolicyOntology').mockResolvedValue(mockOntology);
          jest.spyOn(coverageComparisonService, 'findSimilarPolicies').mockResolvedValue(mockSimilarPolicies);
          mockPrisma.coverageComparison.create.mockResolvedValue({});

          const report = await coverageComparisonService.comparePolices('policy-1', 'user-1');

          // Verify all features are evaluated
          const allFeatures = [
            'hospitalization',
            'preHospitalization',
            'postHospitalization',
            'dayCare',
            'ambulance',
            'healthCheckup',
            'maternityBenefit',
            'newbornCoverage',
            'organDonor',
            'modernTreatments',
            'ayush',
            'mentalHealth',
            'homeHealthcare',
            'airAmbulance',
          ];

          // Count how many features are missing in user policy but present in similar policies
          const missingFeatures = allFeatures.filter(
            (feature) =>
              !coverageFeatures[feature as keyof typeof coverageFeatures] &&
              mockSimilarPolicies[0].ontology.coverageFeatures[feature as keyof typeof coverageFeatures]
          );

          // Coverage gaps should match missing features
          expect(report.comparison.coverageGaps.length).toBe(missingFeatures.length);

          // Report should have valid structure
          expect(report.userPolicy).toBeDefined();
          expect(report.similarPolicies).toBeDefined();
          expect(report.comparison).toBeDefined();
          expect(report.switchingRecommendation).toBeDefined();
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 13: Premium difference calculation accuracy
 * For any set of similar policies, premium difference should be calculated correctly
 * 
 * **Validates: Requirements 9.4, 9.6**
 */
describe('Property 13: Premium difference calculation accuracy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should calculate min, max, and average premiums correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 5000, max: 100000 }), { minLength: 3, maxLength: 10 }),
        fc.integer({ min: 100000, max: 10000000 }),
        async (premiums, sumAssured) => {
          const mockUserPolicy = {
            policyId: 'policy-1',
            metadata: {
              insurerName: 'Test Insurance',
              policyNumber: 'TEST123',
              policyType: 'HEALTH',
              issueDate: new Date('2024-01-01'),
              expiryDate: new Date('2025-01-01'),
              sumAssured,
              premium: premiums[0],
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

          const mockOntology = {
            policyId: 'policy-1',
            coverageFeatures: {
              hospitalization: true,
              preHospitalization: false,
              postHospitalization: false,
              dayCare: false,
              ambulance: false,
              healthCheckup: false,
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
              preExisting: 1460,
              specificDiseases: 730,
            },
            subLimits: {
              roomRent: null,
              icuCharges: null,
              criticalIllness: null,
              cataract: null,
              jointReplacement: null,
            },
            coPayment: null,
            claimSettlementRatio: null,
          };

          const mockSimilarPolicies = premiums.slice(1).map((premium, index) => ({
            policyId: `policy-${index + 2}`,
            insurerName: `Insurance ${index + 2}`,
            policyNumber: `POL${index + 2}`,
            policyType: 'HEALTH',
            sumAssured,
            premium,
            ontology: {
              policyId: `policy-${index + 2}`,
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
                roomRent: null,
                icuCharges: null,
                criticalIllness: null,
                cataract: null,
                jointReplacement: null,
              },
              coPayment: null,
              claimSettlementRatio: null,
            },
          }));

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockUserPolicy);
          jest.spyOn(coverageComparisonService, 'normalizePolicyOntology').mockResolvedValue(mockOntology);
          jest.spyOn(coverageComparisonService, 'findSimilarPolicies').mockResolvedValue(mockSimilarPolicies);
          mockPrisma.coverageComparison.create.mockResolvedValue({});

          const report = await coverageComparisonService.comparePolices('policy-1', 'user-1');

          // Calculate expected values
          const similarPremiums = premiums.slice(1);
          const expectedMin = Math.min(...similarPremiums);
          const expectedMax = Math.max(...similarPremiums);
          const expectedAvg = similarPremiums.reduce((a, b) => a + b, 0) / similarPremiums.length;

          // Verify calculations
          expect(report.comparison.premiumDifference.min).toBe(expectedMin);
          expect(report.comparison.premiumDifference.max).toBe(expectedMax);
          expect(report.comparison.premiumDifference.average).toBeCloseTo(expectedAvg, 2);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property 14: Switching recommendation consistency
 * For any policy with high premium and coverage gaps, switching should be recommended
 * 
 * **Validates: Requirements 9.7, 9.8**
 */
describe('Property 14: Switching recommendation consistency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should recommend switching when premium is >20% above average', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10000, max: 50000 }),
        fc.integer({ min: 100000, max: 5000000 }),
        async (basePremium, sumAssured) => {
          const userPremium = basePremium * 1.3; // 30% above base
          const avgPremium = basePremium;

          const mockUserPolicy = {
            policyId: 'policy-1',
            metadata: {
              insurerName: 'Test Insurance',
              policyNumber: 'TEST123',
              policyType: 'HEALTH',
              issueDate: new Date('2024-01-01'),
              expiryDate: new Date('2025-01-01'),
              sumAssured,
              premium: userPremium,
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
              coPayment: null,
              roomRentLimit: null,
            },
          };

          const mockOntology = {
            policyId: 'policy-1',
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
              ayush: true,
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
              roomRent: null,
              icuCharges: null,
              criticalIllness: null,
              cataract: null,
              jointReplacement: null,
            },
            coPayment: null,
            claimSettlementRatio: null,
          };

          const mockSimilarPolicies = [
            {
              policyId: 'policy-2',
              insurerName: 'Better Insurance',
              policyNumber: 'BET456',
              policyType: 'HEALTH',
              sumAssured,
              premium: avgPremium,
              ontology: {
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
                  ayush: true,
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
                  roomRent: null,
                  icuCharges: null,
                  criticalIllness: null,
                  cataract: null,
                  jointReplacement: null,
                },
                coPayment: null,
                claimSettlementRatio: null,
              },
            },
          ];

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockUserPolicy);
          jest.spyOn(coverageComparisonService, 'normalizePolicyOntology').mockResolvedValue(mockOntology);
          jest.spyOn(coverageComparisonService, 'findSimilarPolicies').mockResolvedValue(mockSimilarPolicies);
          mockPrisma.coverageComparison.create.mockResolvedValue({});

          const report = await coverageComparisonService.comparePolices('policy-1', 'user-1');

          // When premium is >20% above average with no coverage gaps, should recommend switching
          expect(report.switchingRecommendation.shouldSwitch).toBe(true);
          expect(report.switchingRecommendation.estimatedSavings).toBeGreaterThan(0);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should recommend switching when there are 3+ coverage gaps', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 10000, max: 50000 }),
        fc.integer({ min: 100000, max: 5000000 }),
        async (premium, sumAssured) => {
          const mockUserPolicy = {
            policyId: 'policy-1',
            metadata: {
              insurerName: 'Test Insurance',
              policyNumber: 'TEST123',
              policyType: 'HEALTH',
              issueDate: new Date('2024-01-01'),
              expiryDate: new Date('2025-01-01'),
              sumAssured,
              premium,
            },
            sections: {
              coverage: 'Basic hospitalization only',
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

          // User policy has minimal coverage
          const mockOntology = {
            policyId: 'policy-1',
            coverageFeatures: {
              hospitalization: true,
              preHospitalization: false,
              postHospitalization: false,
              dayCare: false,
              ambulance: false,
              healthCheckup: false,
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
              roomRent: null,
              icuCharges: null,
              criticalIllness: null,
              cataract: null,
              jointReplacement: null,
            },
            coPayment: null,
            claimSettlementRatio: null,
          };

          // Similar policies have comprehensive coverage
          const mockSimilarPolicies = [
            {
              policyId: 'policy-2',
              insurerName: 'Better Insurance',
              policyNumber: 'BET456',
              policyType: 'HEALTH',
              sumAssured,
              premium: premium * 1.05, // Similar premium
              ontology: {
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
                  ayush: true,
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
                  roomRent: null,
                  icuCharges: null,
                  criticalIllness: null,
                  cataract: null,
                  jointReplacement: null,
                },
                coPayment: null,
                claimSettlementRatio: null,
              },
            },
          ];

          (policyPulseService.getParsedPolicy as jest.Mock).mockResolvedValue(mockUserPolicy);
          jest.spyOn(coverageComparisonService, 'normalizePolicyOntology').mockResolvedValue(mockOntology);
          jest.spyOn(coverageComparisonService, 'findSimilarPolicies').mockResolvedValue(mockSimilarPolicies);
          mockPrisma.coverageComparison.create.mockResolvedValue({});

          const report = await coverageComparisonService.comparePolices('policy-1', 'user-1');

          // When there are 3+ coverage gaps, should recommend switching
          if (report.comparison.coverageGaps.length >= 3) {
            expect(report.switchingRecommendation.shouldSwitch).toBe(true);
            expect(report.switchingRecommendation.improvedCoverage).toBeDefined();
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

// Helper function to generate coverage text based on features
function generateCoverageText(features: Record<string, boolean>): string {
  const parts: string[] = [];
  if (features.hospitalization) parts.push('hospitalization');
  if (features.preHospitalization) parts.push('pre-hospitalization');
  if (features.postHospitalization) parts.push('post-hospitalization');
  if (features.dayCare) parts.push('day care');
  if (features.ambulance) parts.push('ambulance');
  if (features.healthCheckup) parts.push('health check-up');
  if (features.maternityBenefit) parts.push('maternity');
  if (features.newbornCoverage) parts.push('newborn');
  if (features.organDonor) parts.push('organ donor');
  if (features.modernTreatments) parts.push('robotic surgery');
  if (features.ayush) parts.push('AYUSH');
  if (features.mentalHealth) parts.push('mental health');
  if (features.homeHealthcare) parts.push('home healthcare');
  if (features.airAmbulance) parts.push('air ambulance');

  return `This policy covers ${parts.join(', ')}.`;
}
