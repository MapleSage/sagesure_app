/**
 * ScamShield Service Unit Tests
 * Tests specific examples and edge cases for scam detection
 * 
 * **Validates: Requirements 3.1, 3.2**
 */

import { ScamShieldService } from './scamshield.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const scamShieldService = new ScamShieldService();

describe('ScamShield Service - Unit Tests', () => {
  beforeAll(async () => {
    // Ensure test patterns exist
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
          patternText: 'Digital arrest warrant issued',
          patternCategory: 'DIGITAL_ARREST',
          riskLevel: 'CRITICAL',
          keywords: ['arrest', 'warrant', 'digital'],
          regexPattern: '.*(arrest|warrant).*(digital|video).*',
        },
        {
          patternText: 'KYC update required',
          patternCategory: 'KYC_PHISHING',
          riskLevel: 'HIGH',
          keywords: ['kyc', 'update', 'aadhaar'],
          regexPattern: '.*(kyc|verification).*(update|required).*',
        },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('analyzeMessage', () => {
    it('should detect policy suspension scam', async () => {
      const message = 'Your policy has been suspended. Click here to reactivate immediately.';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      expect(analysis.riskScore).toBeGreaterThan(50);
      expect(analysis.matchedPatterns).toContain('POLICY_SUSPENSION');
      expect(analysis.warnings.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect digital arrest scam with high risk', async () => {
      const message = 'CBI officer calling. Digital arrest warrant issued. Join video call immediately.';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      expect(analysis.riskScore).toBeGreaterThan(70);
      expect(analysis.isScam).toBe(true);
      expect(analysis.matchedPatterns).toContain('DIGITAL_ARREST');
      expect(analysis.warnings.some(w => w.includes('CRITICAL'))).toBe(true);
    });

    it('should detect KYC phishing attempt', async () => {
      const message = 'KYC update required for your insurance. Share Aadhaar and PAN details.';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      expect(analysis.riskScore).toBeGreaterThan(40);
      expect(analysis.matchedPatterns).toContain('KYC_PHISHING');
    });

    it('should handle benign messages with low risk', async () => {
      const message = 'Thank you for choosing our insurance services. Have a great day!';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      expect(analysis.riskScore).toBeLessThan(30);
      expect(analysis.isScam).toBe(false);
    });

    it('should handle empty message', async () => {
      const analysis = await scamShieldService.analyzeMessage('', 'test-user');

      expect(analysis.riskScore).toBeGreaterThanOrEqual(0);
      expect(analysis.riskScore).toBeLessThanOrEqual(100);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect multiple scam indicators', async () => {
      const message = 'URGENT: Your policy suspended. Pay Rs 5000 now. Click here immediately.';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      // Multiple indicators should increase risk score
      expect(analysis.riskScore).toBeGreaterThan(60);
      expect(analysis.warnings.length).toBeGreaterThan(0);
    });

    it('should detect urgency keywords', async () => {
      const message = 'URGENT IMMEDIATE ACTION REQUIRED NOW';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      // Urgency keywords should contribute to risk score
      expect(analysis.riskScore).toBeGreaterThan(20);
    });

    it('should detect financial keywords', async () => {
      const message = 'Pay Rs 10000 transfer amount fee charge payment';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      // Financial keywords should contribute to risk score
      expect(analysis.riskScore).toBeGreaterThan(15);
    });

    it('should detect suspicious links', async () => {
      const message = 'Click here: https://fake-insurance.com or bit.ly/scam123';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      // Links should increase risk score
      expect(analysis.riskScore).toBeGreaterThan(15);
    });

    it('should detect phone numbers', async () => {
      const message = 'Call +91-9876543210 or 1800-123-4567 immediately';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      // Phone numbers should contribute to risk score
      expect(analysis.riskScore).toBeGreaterThan(10);
    });

    it('should provide appropriate warnings for high-risk messages', async () => {
      const message = 'Digital arrest warrant. Video call required.';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      expect(analysis.warnings.length).toBeGreaterThan(0);
      expect(analysis.warnings.some(w => w.includes('CRITICAL') || w.includes('⚠️'))).toBe(true);
    });

    it('should provide recommendations for all risk levels', async () => {
      const messages = [
        'Hello', // Low risk
        'Your policy needs update', // Medium risk
        'URGENT: Pay now or face arrest', // High risk
      ];

      for (const message of messages) {
        const analysis = await scamShieldService.analyzeMessage(message, 'test-user');
        expect(analysis.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should handle case-insensitive matching', async () => {
      const messages = [
        'YOUR POLICY HAS BEEN SUSPENDED',
        'your policy has been suspended',
        'YoUr PoLiCy HaS bEeN sUsPeNdEd',
      ];

      const results = await Promise.all(
        messages.map(msg => scamShieldService.analyzeMessage(msg, 'test-user'))
      );

      // All variations should have similar risk scores
      const riskScores = results.map(r => r.riskScore);
      const maxDiff = Math.max(...riskScores) - Math.min(...riskScores);
      expect(maxDiff).toBeLessThan(10); // Allow small variance
    });

    it('should complete analysis within performance bounds', async () => {
      const message = 'Test message for performance';
      const startTime = Date.now();

      await scamShieldService.analyzeMessage(message, 'test-user');

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(2000); // 2 seconds
    });
  });

  describe('Risk Score Calculation', () => {
    it('should assign higher scores to CRITICAL patterns', async () => {
      const criticalMessage = 'Digital arrest warrant issued by CBI';
      const highMessage = 'Your policy has been suspended';

      const criticalAnalysis = await scamShieldService.analyzeMessage(criticalMessage, 'test-user');
      const highAnalysis = await scamShieldService.analyzeMessage(highMessage, 'test-user');

      // CRITICAL should have higher risk than HIGH
      expect(criticalAnalysis.riskScore).toBeGreaterThan(highAnalysis.riskScore);
    });

    it('should cap risk score at 100', async () => {
      // Message with many scam indicators
      const message = 'URGENT IMMEDIATE arrest warrant suspended policy pay Rs 50000 click here now transfer fee charge KYC Aadhaar PAN OTP';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      expect(analysis.riskScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Confidence Score Calculation', () => {
    it('should have higher confidence with more pattern matches', async () => {
      const singlePatternMessage = 'Your policy is suspended';
      const multiPatternMessage = 'URGENT: Your policy suspended. Pay fee. Share KYC. Click here.';

      const singleAnalysis = await scamShieldService.analyzeMessage(singlePatternMessage, 'test-user');
      const multiAnalysis = await scamShieldService.analyzeMessage(multiPatternMessage, 'test-user');

      expect(multiAnalysis.confidence).toBeGreaterThanOrEqual(singleAnalysis.confidence);
    });

    it('should have confidence between 0 and 100', async () => {
      const message = 'Test message';
      const analysis = await scamShieldService.analyzeMessage(message, 'test-user');

      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('verifyPhoneNumber', () => {
    beforeAll(async () => {
      // Seed test telemarketer data
      await prisma.telemarketerRegistry.createMany({
        data: [
          {
            phoneNumber: '+911800227717',
            brandName: 'LIC India',
            isVerified: true,
            isScammer: false,
            isDnd: false,
            reportCount: 0,
            lastVerified: new Date(),
          },
          {
            phoneNumber: '+919999999999',
            brandName: null,
            isVerified: false,
            isScammer: true,
            isDnd: false,
            reportCount: 47,
          },
          {
            phoneNumber: '+918888888888',
            brandName: null,
            isVerified: false,
            isScammer: true,
            isDnd: false,
            reportCount: 32,
          },
          {
            phoneNumber: '+919876543210',
            brandName: null,
            isVerified: false,
            isScammer: false,
            isDnd: true,
            reportCount: 0,
            lastVerified: new Date(),
          },
        ],
        skipDuplicates: true,
      });

      // Seed verified brand for LIC
      await prisma.verifiedBrand.upsert({
        where: { brandName: 'LIC India' },
        update: {},
        create: {
          brandName: 'LIC India',
          officialContacts: {
            phone: ['+911800227717', '+911800258585'],
            email: ['customercare@licindia.com'],
            website: 'https://licindia.in',
          },
          verificationStatus: 'VERIFIED',
          verifiedAt: new Date(),
        },
      });
    });

    it('should verify legitimate insurance company number', async () => {
      const verification = await scamShieldService.verifyPhoneNumber('+911800227717', 'test-user');

      expect(verification.isVerified).toBe(true);
      expect(verification.isKnownScammer).toBe(false);
      expect(verification.isDND).toBe(false);
      expect(verification.brandName).toBe('LIC India');
      expect(verification.officialContacts).toBeDefined();
      expect(verification.warnings).toContain(expect.stringContaining('Verified'));
    });

    it('should detect known scammer number', async () => {
      const verification = await scamShieldService.verifyPhoneNumber('+919999999999', 'test-user');

      expect(verification.isVerified).toBe(false);
      expect(verification.isKnownScammer).toBe(true);
      expect(verification.isDND).toBe(false);
      expect(verification.brandName).toBeUndefined();
      expect(verification.warnings).toContain(expect.stringContaining('WARNING'));
      expect(verification.warnings).toContain(expect.stringContaining('scammer'));
    });

    it('should detect DND registered number', async () => {
      const verification = await scamShieldService.verifyPhoneNumber('+919876543210', 'test-user');

      expect(verification.isVerified).toBe(false);
      expect(verification.isKnownScammer).toBe(false);
      expect(verification.isDND).toBe(true);
      expect(verification.warnings).toContain(expect.stringContaining('DND'));
    });

    it('should handle unregistered number', async () => {
      const verification = await scamShieldService.verifyPhoneNumber('+917000000000', 'test-user');

      expect(verification.isVerified).toBe(false);
      expect(verification.isKnownScammer).toBe(false);
      expect(verification.isDND).toBe(false);
      expect(verification.brandName).toBeUndefined();
      expect(verification.warnings).toContain(expect.stringContaining('not verified'));
    });

    it('should normalize phone number with spaces and dashes', async () => {
      const verification1 = await scamShieldService.verifyPhoneNumber('+91 1800 227 717', 'test-user');
      const verification2 = await scamShieldService.verifyPhoneNumber('+91-1800-227-717', 'test-user');

      expect(verification1.isVerified).toBe(true);
      expect(verification2.isVerified).toBe(true);
      expect(verification1.brandName).toBe('LIC India');
      expect(verification2.brandName).toBe('LIC India');
    });

    it('should handle multiple scammer numbers', async () => {
      const verification1 = await scamShieldService.verifyPhoneNumber('+919999999999', 'test-user');
      const verification2 = await scamShieldService.verifyPhoneNumber('+918888888888', 'test-user');

      expect(verification1.isKnownScammer).toBe(true);
      expect(verification2.isKnownScammer).toBe(true);
    });

    it('should include official contacts for verified brands', async () => {
      const verification = await scamShieldService.verifyPhoneNumber('+911800227717', 'test-user');

      expect(verification.officialContacts).toBeDefined();
      expect(verification.officialContacts?.phone).toContain('+911800227717');
      expect(verification.officialContacts?.website).toBe('https://licindia.in');
    });
  });
});
