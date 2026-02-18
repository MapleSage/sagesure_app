/**
 * ScamShield Service Property-Based Tests
 * Tests universal properties that should hold for all inputs
 * 
 * **Validates: Requirements 3.1, 3.2**
 */

import * as fc from 'fast-check';
import { ScamShieldService } from './scamshield.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const scamShieldService = new ScamShieldService();

// Arbitraries for generating test data
const messageArbitrary = fc.string({ minLength: 1, maxLength: 1000 });
const userIdArbitrary = fc.uuid();

describe('ScamShield Service - Property-Based Tests', () => {
  beforeAll(async () => {
    // Ensure database has some scam patterns for testing
    const patternCount = await prisma.scamPattern.count();
    if (patternCount === 0) {
      // Insert a few test patterns
      await prisma.scamPattern.createMany({
        data: [
          {
            patternText: 'Your policy has been suspended',
            patternCategory: 'POLICY_SUSPENSION',
            riskLevel: 'HIGH',
            keywords: ['suspended', 'policy'],
            regexPattern: '.*(suspend|block).*(policy).*',
          },
          {
            patternText: 'Congratulations! You won cashback',
            patternCategory: 'FAKE_CASHBACK',
            riskLevel: 'HIGH',
            keywords: ['congratulations', 'won', 'cashback'],
            regexPattern: '.*(congratulation|won).*(cashback).*',
          },
          {
            patternText: 'Digital arrest warrant issued',
            patternCategory: 'DIGITAL_ARREST',
            riskLevel: 'CRITICAL',
            keywords: ['arrest', 'warrant'],
            regexPattern: '.*(arrest|warrant).*',
          },
        ],
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

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
          
          // Analysis should complete within 2000ms (2 seconds)
          expect(duration).toBeLessThan(2000);
        }),
        {
          numRuns: 50, // Run 50 test cases
          timeout: 5000, // Allow 5 seconds total for the test
        }
      );
    }, 120000); // 2 minute timeout for the entire test suite

    it('should handle empty messages within 2 seconds', async () => {
      const startTime = Date.now();
      
      await scamShieldService.analyzeMessage('', 'test-user-id');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });

    it('should handle very long messages within 2 seconds', async () => {
      const longMessage = 'test '.repeat(2000); // 10,000 characters
      const startTime = Date.now();
      
      await scamShieldService.analyzeMessage(longMessage, 'test-user-id');
      
      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000);
    });
  });

  /**
   * Property 7: Risk score validity
   * For any analysis, risk score should be between 0 and 100
   * 
   * **Validates: Requirements 3.2**
   */
  describe('Property 7: Risk score validity', () => {
    it('should always return risk score between 0 and 100', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);
          
          // Risk score must be between 0 and 100 (inclusive)
          expect(analysis.riskScore).toBeGreaterThanOrEqual(0);
          expect(analysis.riskScore).toBeLessThanOrEqual(100);
          
          // Risk score should be a number
          expect(typeof analysis.riskScore).toBe('number');
          expect(Number.isFinite(analysis.riskScore)).toBe(true);
          expect(Number.isNaN(analysis.riskScore)).toBe(false);
        }),
        {
          numRuns: 100, // Run 100 test cases
        }
      );
    });

    it('should return valid risk score for edge cases', async () => {
      const edgeCases = [
        '', // Empty string
        ' ', // Single space
        'a', // Single character
        '!@#$%^&*()', // Special characters only
        '12345', // Numbers only
        'test '.repeat(2000), // Very long message
        'URGENT URGENT URGENT', // Repeated urgency keywords
        'Rs 50000 pay now click here', // Multiple scam indicators
      ];

      for (const message of edgeCases) {
        const analysis = await scamShieldService.analyzeMessage(message, 'test-user-id');
        
        expect(analysis.riskScore).toBeGreaterThanOrEqual(0);
        expect(analysis.riskScore).toBeLessThanOrEqual(100);
        expect(Number.isFinite(analysis.riskScore)).toBe(true);
      }
    });

    it('should set isScam flag correctly based on risk score', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);
          
          // isScam should be true if riskScore > 70, false otherwise
          if (analysis.riskScore > 70) {
            expect(analysis.isScam).toBe(true);
          } else {
            expect(analysis.isScam).toBe(false);
          }
        }),
        {
          numRuns: 100,
        }
      );
    });
  });

  /**
   * Additional property: Confidence score validity
   * For any analysis, confidence score should be between 0 and 100
   */
  describe('Property: Confidence score validity', () => {
    it('should always return confidence score between 0 and 100', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);
          
          expect(analysis.confidence).toBeGreaterThanOrEqual(0);
          expect(analysis.confidence).toBeLessThanOrEqual(100);
          expect(typeof analysis.confidence).toBe('number');
          expect(Number.isFinite(analysis.confidence)).toBe(true);
        }),
        {
          numRuns: 100,
        }
      );
    });
  });

  /**
   * Additional property: Analysis structure consistency
   * For any message, analysis should always return the expected structure
   */
  describe('Property: Analysis structure consistency', () => {
    it('should always return analysis with required fields', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);
          
          // Check all required fields exist
          expect(analysis).toHaveProperty('riskScore');
          expect(analysis).toHaveProperty('isScam');
          expect(analysis).toHaveProperty('matchedPatterns');
          expect(analysis).toHaveProperty('warnings');
          expect(analysis).toHaveProperty('recommendations');
          expect(analysis).toHaveProperty('confidence');
          
          // Check field types
          expect(typeof analysis.riskScore).toBe('number');
          expect(typeof analysis.isScam).toBe('boolean');
          expect(Array.isArray(analysis.matchedPatterns)).toBe(true);
          expect(Array.isArray(analysis.warnings)).toBe(true);
          expect(Array.isArray(analysis.recommendations)).toBe(true);
          expect(typeof analysis.confidence).toBe('number');
          
          // Arrays should contain strings
          analysis.matchedPatterns.forEach(pattern => {
            expect(typeof pattern).toBe('string');
          });
          analysis.warnings.forEach(warning => {
            expect(typeof warning).toBe('string');
          });
          analysis.recommendations.forEach(rec => {
            expect(typeof rec).toBe('string');
          });
        }),
        {
          numRuns: 100,
        }
      );
    });

    it('should always provide at least one recommendation', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis = await scamShieldService.analyzeMessage(message, userId);
          
          // Should always have at least one recommendation
          expect(analysis.recommendations.length).toBeGreaterThan(0);
        }),
        {
          numRuns: 50,
        }
      );
    });
  });

  /**
   * Additional property: Idempotency
   * Analyzing the same message multiple times should yield consistent results
   */
  describe('Property: Idempotency', () => {
    it('should return consistent results for the same message', async () => {
      await fc.assert(
        fc.asyncProperty(messageArbitrary, userIdArbitrary, async (message, userId) => {
          const analysis1 = await scamShieldService.analyzeMessage(message, userId);
          const analysis2 = await scamShieldService.analyzeMessage(message, userId);
          
          // Risk scores should be identical
          expect(analysis1.riskScore).toBe(analysis2.riskScore);
          expect(analysis1.isScam).toBe(analysis2.isScam);
          expect(analysis1.confidence).toBe(analysis2.confidence);
          
          // Matched patterns should be the same
          expect(analysis1.matchedPatterns.sort()).toEqual(analysis2.matchedPatterns.sort());
        }),
        {
          numRuns: 30,
        }
      );
    });
  });

  /**
   * Additional property: Known scam patterns detection
   * Messages containing known scam keywords should have elevated risk scores
   */
  describe('Property: Known scam patterns detection', () => {
    it('should detect messages with critical scam keywords', async () => {
      const criticalKeywords = [
        'arrest warrant',
        'digital arrest',
        'police video call',
        'CBI investigation',
        'suspended policy click here',
        'pay processing fee claim approved',
      ];

      for (const keyword of criticalKeywords) {
        const analysis = await scamShieldService.analyzeMessage(keyword, 'test-user-id');
        
        // Messages with critical keywords should have elevated risk
        expect(analysis.riskScore).toBeGreaterThan(30);
      }
    });

    it('should have lower risk for benign messages', async () => {
      const benignMessages = [
        'Hello, how are you?',
        'Thank you for your help',
        'Have a nice day',
        'Meeting at 3 PM',
      ];

      for (const message of benignMessages) {
        const analysis = await scamShieldService.analyzeMessage(message, 'test-user-id');
        
        // Benign messages should have low risk
        expect(analysis.riskScore).toBeLessThan(50);
      }
    });
  });
});
