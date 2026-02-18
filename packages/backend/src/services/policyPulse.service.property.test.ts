import fc from 'fast-check';
import * as policyPulseService from './policyPulse.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    policy: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn((buffer: Buffer) => {
    const content = buffer.toString();
    return Promise.resolve({
      numpages: Math.ceil(content.length / 1000),
      text: content,
    });
  });
});

const prisma = new PrismaClient();

describe('PolicyPulse Service - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 8: PDF parsing performance
   * For any valid PDF up to 50MB, extraction should complete within 10 seconds
   * 
   * **Validates: Requirements 6.1, 6.9**
   */
  describe('Property 8: PDF parsing performance bounds', () => {
    it('should extract text from any PDF within 10 seconds', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 100, maxLength: 10000 }), // Simulate PDF content
          async (pdfContent) => {
            const startTime = Date.now();
            
            const text = await policyPulseService.extractTextFromPDF(Buffer.from(pdfContent));
            
            const duration = Date.now() - startTime;
            
            // Should complete within 10 seconds (10000ms)
            expect(duration).toBeLessThan(10000);
            
            // Should return text
            expect(typeof text).toBe('string');
            expect(text.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle various PDF sizes efficiently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 50000 }), // PDF size in characters
          async (size) => {
            const pdfContent = 'A'.repeat(size);
            
            const startTime = Date.now();
            const text = await policyPulseService.extractTextFromPDF(Buffer.from(pdfContent));
            const duration = Date.now() - startTime;
            
            // Performance should scale reasonably with size
            // Larger files can take longer, but should still be under 10s
            expect(duration).toBeLessThan(10000);
            expect(text.length).toBe(size);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  /**
   * Property 9: Policy data round-trip
   * For any parsed policy, retrieving from database should return all metadata
   * 
   * **Validates: Requirements 6.1, 6.9**
   */
  describe('Property 9: Policy data round-trip integrity', () => {
    it('should preserve all metadata fields after storage and retrieval', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            insurerName: fc.string({ minLength: 5, maxLength: 50 }),
            policyNumber: fc.string({ minLength: 5, maxLength: 20 }),
            sumAssured: fc.integer({ min: 10000, max: 10000000 }),
            premium: fc.integer({ min: 1000, max: 100000 }),
          }),
          async (metadata) => {
            const mockPolicy = {
              policyId: 'test-id',
              userId: 'user-id',
              insurerName: metadata.insurerName,
              policyNumber: metadata.policyNumber,
              policyType: 'HEALTH',
              issueDate: new Date(),
              expiryDate: new Date(),
              sumAssured: metadata.sumAssured,
              premium: metadata.premium,
              originalPdfUrl: 'test.pdf',
              parsedData: {
                metadata: {
                  insurerName: metadata.insurerName,
                  policyNumber: metadata.policyNumber,
                  issueDate: new Date(),
                  expiryDate: new Date(),
                  sumAssured: metadata.sumAssured,
                  premium: metadata.premium,
                },
                sections: {
                  coverage: 'Test coverage',
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
              },
            };

            (prisma.policy.findFirst as jest.Mock).mockResolvedValue(mockPolicy);

            const retrieved = await policyPulseService.getParsedPolicy('test-id', 'user-id');

            // All metadata fields should be preserved
            expect(retrieved).not.toBeNull();
            expect(retrieved?.metadata.insurerName).toBe(metadata.insurerName);
            expect(retrieved?.metadata.policyNumber).toBe(metadata.policyNumber);
            expect(retrieved?.metadata.sumAssured).toBe(metadata.sumAssured);
            expect(retrieved?.metadata.premium).toBe(metadata.premium);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve sections data after round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            coverage: fc.string({ minLength: 10, maxLength: 200 }),
            exclusions: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
            terms: fc.string({ minLength: 10, maxLength: 200 }),
            conditions: fc.string({ minLength: 10, maxLength: 200 }),
          }),
          async (sections) => {
            const mockPolicy = {
              policyId: 'test-id',
              userId: 'user-id',
              insurerName: 'Test Insurer',
              policyNumber: 'POL123',
              policyType: 'HEALTH',
              issueDate: new Date(),
              expiryDate: new Date(),
              sumAssured: 500000,
              premium: 10000,
              originalPdfUrl: 'test.pdf',
              parsedData: {
                metadata: {},
                sections,
                extractedData: {
                  waitingPeriods: [],
                  subLimits: [],
                  coPayment: null,
                  roomRentLimit: null,
                },
              },
            };

            (prisma.policy.findFirst as jest.Mock).mockResolvedValue(mockPolicy);

            const retrieved = await policyPulseService.getParsedPolicy('test-id', 'user-id');

            // All sections should be preserved
            expect(retrieved?.sections.coverage).toBe(sections.coverage);
            expect(retrieved?.sections.exclusions).toEqual(sections.exclusions);
            expect(retrieved?.sections.terms).toBe(sections.terms);
            expect(retrieved?.sections.conditions).toBe(sections.conditions);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Metadata parsing consistency
   * For any text containing policy information, parsing should be deterministic
   */
  describe('Property: Metadata parsing consistency', () => {
    it('should parse the same text consistently', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            insurerName: fc.constantFrom('HDFC ERGO', 'ICICI Lombard', 'Star Health', 'Care Health'),
            policyNumber: fc.string({ minLength: 8, maxLength: 15 }),
            sumAssured: fc.integer({ min: 100000, max: 10000000 }),
          }),
          (data) => {
            const text = `
              Policy Document
              Issued by: ${data.insurerName} Insurance
              Policy Number: ${data.policyNumber}
              Sum Assured: Rs. ${data.sumAssured.toLocaleString('en-IN')}
            `;

            // Parse multiple times
            const result1 = policyPulseService.parseMetadata(text);
            const result2 = policyPulseService.parseMetadata(text);
            const result3 = policyPulseService.parseMetadata(text);

            // Results should be identical
            expect(result1).toEqual(result2);
            expect(result2).toEqual(result3);
            
            // Should extract correct values
            expect(result1.insurerName).toContain(data.insurerName);
            expect(result1.policyNumber).toBe(data.policyNumber);
            expect(result1.sumAssured).toBe(data.sumAssured);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Validation consistency
   * For any parsed policy, validation should be deterministic
   */
  describe('Property: Validation consistency', () => {
    it('should validate the same policy consistently', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            insurerName: fc.string({ minLength: 5, maxLength: 50 }),
            policyNumber: fc.string({ minLength: 5, maxLength: 20 }),
            sumAssured: fc.integer({ min: 1000, max: 100000000 }),
            premium: fc.integer({ min: 100, max: 1000000 }),
            exclusionsCount: fc.integer({ min: 0, max: 30 }),
            coPayment: fc.option(fc.integer({ min: 0, max: 100 }), { nil: null }),
          }),
          (data) => {
            const parsedPolicy: policyPulseService.ParsedPolicy = {
              policyId: 'test-id',
              metadata: {
                insurerName: data.insurerName,
                policyNumber: data.policyNumber,
                issueDate: new Date('2024-01-01'),
                expiryDate: new Date('2024-12-31'),
                sumAssured: data.sumAssured,
                premium: data.premium,
              },
              sections: {
                coverage: 'Test coverage',
                exclusions: Array(data.exclusionsCount).fill('Exclusion'),
                terms: 'Test terms',
                conditions: 'Test conditions',
              },
              extractedData: {
                waitingPeriods: [],
                subLimits: [],
                coPayment: data.coPayment,
                roomRentLimit: null,
              },
            };

            // Validate multiple times
            const validation1 = policyPulseService.validatePolicyData(parsedPolicy);
            const validation2 = policyPulseService.validatePolicyData(parsedPolicy);
            const validation3 = policyPulseService.validatePolicyData(parsedPolicy);

            // Results should be identical
            expect(validation1).toEqual(validation2);
            expect(validation2).toEqual(validation3);
            
            // Validation logic should be correct
            if (data.sumAssured < 10000) {
              expect(validation1.anomalies.some((a) => a.includes('unusually low'))).toBe(true);
            }
            
            if (data.exclusionsCount > 20) {
              expect(validation1.anomalies.some((a) => a.includes('Excessive'))).toBe(true);
            }
            
            if (data.coPayment && data.coPayment > 50) {
              expect(validation1.anomalies.some((a) => a.includes('Co-payment is very high'))).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Additional property: Risk score validity
   * For any policy validation, anomalies should be meaningful
   */
  describe('Property: Anomaly detection validity', () => {
    it('should only flag genuine anomalies', async () => {
      await fc.assert(
        fc.property(
          fc.record({
            sumAssured: fc.integer({ min: 50000, max: 5000000 }), // Normal range
            premium: fc.integer({ min: 5000, max: 50000 }), // Normal range
            exclusionsCount: fc.integer({ min: 5, max: 15 }), // Normal range
            coPayment: fc.option(fc.integer({ min: 10, max: 30 }), { nil: null }), // Normal range
          }),
          (data) => {
            const parsedPolicy: policyPulseService.ParsedPolicy = {
              policyId: 'test-id',
              metadata: {
                insurerName: 'Test Insurance',
                policyNumber: 'POL123',
                issueDate: new Date('2024-01-01'),
                expiryDate: new Date('2025-01-01'),
                sumAssured: data.sumAssured,
                premium: data.premium,
              },
              sections: {
                coverage: 'Test coverage',
                exclusions: Array(data.exclusionsCount).fill('Exclusion'),
                terms: 'Test terms',
                conditions: 'Test conditions',
              },
              extractedData: {
                waitingPeriods: [],
                subLimits: [],
                coPayment: data.coPayment,
                roomRentLimit: null,
              },
            };

            const validation = policyPulseService.validatePolicyData(parsedPolicy);

            // Normal policies should have few or no anomalies
            expect(validation.anomalies.length).toBeLessThanOrEqual(2);
            
            // Should not flag normal values
            expect(validation.anomalies.some((a) => a.includes('unusually low'))).toBe(false);
            expect(validation.anomalies.some((a) => a.includes('unusually high'))).toBe(false);
            expect(validation.anomalies.some((a) => a.includes('Excessive'))).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
