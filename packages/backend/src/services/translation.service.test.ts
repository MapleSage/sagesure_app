/**
 * Translation Service Unit Tests
 *
 * **Validates: Requirements 7.2, 7.4, 7.5, 7.10**
 */

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

import { TranslationService } from './translation.service';

describe('TranslationService', () => {
  let service: TranslationService;

  const mockPolicy = {
    id: 'policy-123',
    insurerName: 'HDFC Ergo',
    policyType: 'HEALTH',
    sumAssured: 500000,
    premium: 15000,
    issueDate: new Date('2024-01-01'),
    expiryDate: new Date('2025-01-01'),
    parsedData: {
      metadata: { insurerName: 'HDFC Ergo', policyNumber: 'HE-2024-001', premium: 15000 },
      sections: {
        coverage: 'Hospitalization, surgery, day care procedures, ambulance charges',
        exclusions: ['Pre-existing conditions for 4 years', 'Cosmetic surgery', 'Self-inflicted injuries'],
        terms: 'Standard terms apply',
        conditions: 'Subject to policy conditions',
      },
      extractedData: {
        waitingPeriods: [
          { condition: 'Pre-existing', period: '4 years' },
          { condition: 'Maternity', period: '2 years' },
        ],
        subLimits: [{ item: 'Cataract surgery', limit: 50000 }],
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

  describe('generateSummary', () => {
    it('should generate English summary with all required fields', async () => {
      const summary = await service.generateSummary('policy-123', 'en');

      expect(summary.policyId).toBe('policy-123');
      expect(summary.language).toBe('en');
      expect(summary.summary).toContain('HDFC Ergo');
      expect(summary.summary).toContain('HEALTH');
      expect(summary.keyPoints.length).toBeGreaterThan(0);
      expect(summary.disclaimer).toContain('legally binding');
    });

    it('should preserve critical terms with explanations', async () => {
      const summary = await service.generateSummary('policy-123', 'en');

      expect(summary.simplifiedTerms).toHaveProperty('sum assured');
      expect(summary.simplifiedTerms).toHaveProperty('premium');
      expect(summary.simplifiedTerms).toHaveProperty('exclusions');
      expect(summary.simplifiedTerms).toHaveProperty('co-payment');
      expect(summary.simplifiedTerms).toHaveProperty('waiting period');
    });

    it('should highlight exclusions', async () => {
      const summary = await service.generateSummary('policy-123', 'en');

      expect(summary.exclusionsHighlight.length).toBeGreaterThan(0);
    });

    it('should include co-payment and room rent in key points', async () => {
      const summary = await service.generateSummary('policy-123', 'en');

      const keyPointsText = summary.keyPoints.join(' ');
      expect(keyPointsText).toContain('20%');
      expect(keyPointsText).toContain('5,000');
    });

    it('should return cached translation from database', async () => {
      mockFindFirst.mockResolvedValue({
        summary: 'Cached summary',
        keyPoints: ['Point 1'],
        exclusionsHighlight: ['Exclusion 1'],
        simplifiedTerms: { premium: 'Your payment' },
      });

      const summary = await service.generateSummary('policy-123', 'hi');

      expect(summary.summary).toBe('Cached summary');
      expect(mockFindUnique).not.toHaveBeenCalled(); // Should not fetch policy
    });

    it('should store translation in database', async () => {
      // Use a unique policy ID to avoid cache hits from previous tests
      const uniquePolicy = { ...mockPolicy, id: 'policy-store-test' };
      mockFindUnique.mockResolvedValueOnce(uniquePolicy);

      await service.generateSummary('policy-store-test', 'en');

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          policyId: 'policy-store-test',
          language: 'en',
        }),
      });
    });

    it('should throw error for non-existent policy', async () => {
      mockFindFirst.mockResolvedValueOnce(null);
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(service.generateSummary('nonexistent', 'en')).rejects.toThrow('Policy not found');
    });

    it('should generate summaries for all supported languages', async () => {
      const languages = ['en', 'hi', 'ta', 'te', 'mr', 'bn', 'gu'] as const;

      for (const lang of languages) {
        mockFindFirst.mockResolvedValue(null);
        const summary = await service.generateSummary('policy-123', lang);
        expect(summary.language).toBe(lang);
        expect(summary.disclaimer.length).toBeGreaterThan(0);
      }
    });
  });

  describe('askQuestion', () => {
    it('should answer coverage questions from policy data', async () => {
      const answer = await service.askQuestion('policy-123', 'What is covered?', 'en');

      expect(answer.question).toBe('What is covered?');
      expect(answer.answer).toContain('Hospitalization');
      expect(answer.language).toBe('en');
    });

    it('should answer exclusion questions', async () => {
      const answer = await service.askQuestion('policy-123', 'What are the exclusions?', 'en');

      expect(answer.answer).toContain('Pre-existing');
    });

    it('should answer premium questions', async () => {
      const answer = await service.askQuestion('policy-123', 'How much do I pay?', 'en');

      expect(answer.answer).toContain('15,000');
    });

    it('should answer waiting period questions', async () => {
      const answer = await service.askQuestion('policy-123', 'What is the waiting period?', 'en');

      expect(answer.answer).toContain('4 years');
    });

    it('should throw error for non-existent policy', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      await expect(service.askQuestion('nonexistent', 'test', 'en')).rejects.toThrow('Policy not found');
    });
  });
});
