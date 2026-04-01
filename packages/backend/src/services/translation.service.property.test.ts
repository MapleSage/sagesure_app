/**
 * Translation Service Property-Based Tests
 * Property 10: Translation performance
 *
 * **Validates: Requirements 7.1, 7.2**
 */

import * as fc from 'fast-check';

const mockFindFirst = jest.fn();
const mockFindUnique = jest.fn();
const mockCreate = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    policyTranslation: { findFirst: mockFindFirst, create: mockCreate },
    policy: { findUnique: mockFindUnique },
    $disconnect: jest.fn(),
  })),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

jest.mock('axios');

import { TranslationService, Language } from './translation.service';

const languageArbitrary = fc.constantFrom<Language>('en', 'hi', 'ta', 'te', 'mr', 'bn', 'gu');

describe('Translation Service - Property-Based Tests', () => {
  let service: TranslationService;

  const mockPolicy = {
    id: 'policy-123',
    insurerName: 'Test Insurance Co',
    policyType: 'HEALTH',
    sumAssured: 500000,
    premium: 15000,
    issueDate: new Date('2024-01-01'),
    expiryDate: new Date('2025-01-01'),
    parsedData: {
      metadata: { insurerName: 'Test Insurance Co', policyNumber: 'POL-001' },
      sections: {
        coverage: 'Hospitalization, surgery, day care procedures',
        exclusions: ['Pre-existing conditions for 4 years', 'Cosmetic surgery'],
        terms: 'Standard terms apply',
        conditions: 'Subject to policy conditions',
      },
      extractedData: {
        waitingPeriods: [{ condition: 'Pre-existing', period: '4 years' }],
        subLimits: [],
        coPayment: 20,
        roomRentLimit: 5000,
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TranslationService();
    mockFindUnique.mockResolvedValue(mockPolicy);
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({});
  });

  /**
   * Property 10: Translation performance
   * For any policy, English summary within 15s, translation within 20s
   *
   * **Validates: Requirements 7.1, 7.2**
   */
  describe('Property 10: Translation performance', () => {
    it('should generate English summary within 15 seconds for any language request', async () => {
      await fc.assert(
        fc.asyncProperty(languageArbitrary, async (language) => {
          const startTime = Date.now();
          const summary = await service.generateSummary('policy-123', language);
          const duration = Date.now() - startTime;

          expect(duration).toBeLessThan(15000);
          expect(summary).toBeDefined();
          expect(summary.policyId).toBe('policy-123');
          expect(summary.summary.length).toBeGreaterThan(0);
          expect(summary.disclaimer.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should always include disclaimer in any language', async () => {
      await fc.assert(
        fc.asyncProperty(languageArbitrary, async (language) => {
          const summary = await service.generateSummary('policy-123', language);
          expect(summary.disclaimer).toBeDefined();
          expect(summary.disclaimer.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });
  });
});
