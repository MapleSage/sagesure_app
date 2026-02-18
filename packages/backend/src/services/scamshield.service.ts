/**
 * ScamShield Service
 * Implements scam pattern matching, message analysis, and risk scoring
 */

import { PrismaClient } from '@prisma/client';
import { ScamAnalysis, ScamPattern } from '../types/scamshield';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export class ScamShieldService {
  /**
   * Analyze a message for scam patterns
   * Uses PostgreSQL full-text search with GIN index for performance
   * 
   * @param message - The message text to analyze
   * @param userId - The user ID requesting the analysis
   * @returns ScamAnalysis with risk score, matched patterns, and recommendations
   */
  async analyzeMessage(message: string, userId: string): Promise<ScamAnalysis> {
    const startTime = Date.now();
    
    try {
      logger.info('Analyzing message for scam patterns', { userId, messageLength: message.length });

      // Normalize message for analysis
      const normalizedMessage = message.toLowerCase().trim();

      // Search for matching patterns using full-text search
      const matchedPatterns = await this.searchPatterns(normalizedMessage);

      // Calculate risk score based on matches
      const riskScore = this.calculateRiskScore(matchedPatterns, normalizedMessage);

      // Generate warnings based on matched patterns
      const warnings = this.generateWarnings(matchedPatterns);

      // Generate recommendations
      const recommendations = this.generateRecommendations(riskScore, matchedPatterns);

      // Calculate confidence score
      const confidence = this.calculateConfidence(matchedPatterns, normalizedMessage);

      const analysis: ScamAnalysis = {
        riskScore,
        isScam: riskScore > 70,
        matchedPatterns: matchedPatterns.map(p => p.patternCategory),
        warnings,
        recommendations,
        confidence,
      };

      const duration = Date.now() - startTime;
      logger.info('Message analysis completed', { 
        userId, 
        riskScore, 
        isScam: analysis.isScam,
        matchCount: matchedPatterns.length,
        duration: `${duration}ms`
      });

      return analysis;
    } catch (error) {
      logger.error('Error analyzing message', { userId, error });
      throw new Error('Failed to analyze message');
    }
  }

  /**
   * Search for scam patterns using PostgreSQL full-text search
   * 
   * @param message - Normalized message text
   * @returns Array of matched scam patterns
   */
  private async searchPatterns(message: string): Promise<ScamPattern[]> {
    try {
      // Use full-text search with GIN index for fast pattern matching
      const patterns = await prisma.$queryRaw<ScamPattern[]>`
        SELECT 
          id::text,
          pattern_text as "patternText",
          pattern_category as "patternCategory",
          risk_level as "riskLevel",
          keywords,
          regex_pattern as "regexPattern"
        FROM scam_patterns
        WHERE 
          to_tsvector('english', pattern_text) @@ plainto_tsquery('english', ${message})
          OR ${message} ~* regex_pattern
          OR EXISTS (
            SELECT 1 FROM unnest(keywords) AS keyword
            WHERE ${message} LIKE '%' || keyword || '%'
          )
        LIMIT 50;
      `;

      return patterns;
    } catch (error) {
      logger.error('Error searching scam patterns', { error });
      return [];
    }
  }

  /**
   * Calculate risk score based on matched patterns and message content
   * 
   * Risk scoring algorithm:
   * - CRITICAL patterns: 40 points each
   * - HIGH patterns: 25 points each
   * - MEDIUM patterns: 15 points each
   * - LOW patterns: 5 points each
   * - Multiple matches increase score
   * - Urgency keywords add bonus points
   * - Financial amounts mentioned add bonus points
   * 
   * @param patterns - Matched scam patterns
   * @param message - Normalized message text
   * @returns Risk score (0-100)
   */
  private calculateRiskScore(patterns: ScamPattern[], message: string): number {
    let score = 0;

    // Base score from pattern risk levels
    for (const pattern of patterns) {
      switch (pattern.riskLevel) {
        case 'CRITICAL':
          score += 40;
          break;
        case 'HIGH':
          score += 25;
          break;
        case 'MEDIUM':
          score += 15;
          break;
        case 'LOW':
          score += 5;
          break;
      }
    }

    // Bonus for urgency keywords
    const urgencyKeywords = ['urgent', 'immediate', 'now', 'today', 'asap', 'hurry', 'quick', 'fast'];
    const urgencyCount = urgencyKeywords.filter(keyword => message.includes(keyword)).length;
    score += urgencyCount * 5;

    // Bonus for financial keywords
    const financialKeywords = ['rs', 'rupees', 'pay', 'payment', 'transfer', 'amount', 'fee', 'charge'];
    const financialCount = financialKeywords.filter(keyword => message.includes(keyword)).length;
    score += financialCount * 3;

    // Bonus for suspicious links
    if (message.match(/https?:\/\/|bit\.ly|tinyurl|click here|download/i)) {
      score += 15;
    }

    // Bonus for phone numbers
    if (message.match(/\+?91[-\s]?[6-9]\d{9}|1800[-\s]?\d{3}[-\s]?\d{4}/)) {
      score += 10;
    }

    // Bonus for multiple pattern matches (indicates sophisticated scam)
    if (patterns.length > 3) {
      score += (patterns.length - 3) * 5;
    }

    // Cap at 100
    return Math.min(score, 100);
  }

  /**
   * Generate warnings based on matched patterns
   * 
   * @param patterns - Matched scam patterns
   * @returns Array of warning messages
   */
  private generateWarnings(patterns: ScamPattern[]): string[] {
    const warnings: string[] = [];
    const categories = new Set(patterns.map(p => p.patternCategory));

    if (categories.has('DIGITAL_ARREST')) {
      warnings.push('⚠️ CRITICAL: This appears to be a digital arrest scam. Real law enforcement never conducts arrests over video calls.');
      warnings.push('Do NOT transfer any money or share personal information.');
      warnings.push('Disconnect the call immediately and report to cybercrime.gov.in');
    }

    if (categories.has('POLICY_SUSPENSION')) {
      warnings.push('⚠️ Suspicious policy suspension claim detected. Verify directly with your insurer using official contact numbers.');
    }

    if (categories.has('FAKE_CASHBACK') || categories.has('FAKE_DISCOUNT')) {
      warnings.push('⚠️ Potential fake offer detected. Insurance companies rarely offer unsolicited cashbacks or extreme discounts.');
    }

    if (categories.has('KYC_PHISHING')) {
      warnings.push('⚠️ KYC phishing attempt detected. Never share Aadhaar, PAN, or OTP via SMS or unofficial channels.');
    }

    if (categories.has('ADVANCE_FEE_FRAUD')) {
      warnings.push('⚠️ Advance fee fraud detected. Legitimate insurance claims never require upfront processing fees.');
    }

    if (categories.has('FAKE_REGULATOR')) {
      warnings.push('⚠️ Fake regulator impersonation detected. IRDAI never contacts policyholders directly via SMS for investigations.');
    }

    if (categories.has('MALWARE_LINK') || categories.has('PHISHING_LINK')) {
      warnings.push('⚠️ Suspicious link detected. Do NOT click on links in unsolicited messages.');
    }

    // Generic warning if no specific category matched
    if (warnings.length === 0 && patterns.length > 0) {
      warnings.push('⚠️ This message contains suspicious patterns commonly used in insurance scams.');
    }

    return warnings;
  }

  /**
   * Generate recommendations based on risk score and patterns
   * 
   * @param riskScore - Calculated risk score
   * @param patterns - Matched scam patterns
   * @returns Array of recommendation messages
   */
  private generateRecommendations(riskScore: number, patterns: ScamPattern[]): string[] {
    const recommendations: string[] = [];

    if (riskScore > 70) {
      recommendations.push('🛡️ HIGH RISK: Do not respond to this message or take any action requested.');
      recommendations.push('📞 Contact your insurance company directly using the official number on your policy document.');
      recommendations.push('📝 Report this scam to 1930 (National Cyber Crime Helpline) and TRAI Chakshu.');
      recommendations.push('👨‍👩‍👧 Alert family members, especially elderly relatives, about this scam pattern.');
    } else if (riskScore > 40) {
      recommendations.push('⚠️ MEDIUM RISK: Verify the authenticity of this message before taking any action.');
      recommendations.push('📞 Call your insurer using official contact numbers to confirm.');
      recommendations.push('🚫 Do not click on any links or share personal information.');
    } else if (riskScore > 20) {
      recommendations.push('ℹ️ LOW RISK: This message may be legitimate, but exercise caution.');
      recommendations.push('✅ Verify sender identity through official channels.');
      recommendations.push('🔍 Check for spelling errors, unofficial email addresses, or suspicious links.');
    } else {
      recommendations.push('✅ This message appears to be low risk.');
      recommendations.push('💡 Always verify important insurance communications through official channels.');
    }

    // Add category-specific recommendations
    const categories = new Set(patterns.map(p => p.patternCategory));

    if (categories.has('DIGITAL_ARREST')) {
      recommendations.push('📚 Learn more about digital arrest scams at cybercrime.gov.in');
      recommendations.push('🎥 Real police/CBI never conduct video call arrests or demand money transfers.');
    }

    if (categories.has('KYC_PHISHING')) {
      recommendations.push('🔐 KYC updates should only be done through official insurer portals or branches.');
      recommendations.push('🚫 Never share OTP, Aadhaar, or PAN details via SMS, email, or phone.');
    }

    return recommendations;
  }

  /**
   * Calculate confidence score for the analysis
   * Higher confidence when:
   * - Multiple patterns match
   * - Patterns are high-risk
   * - Message contains clear scam indicators
   * 
   * @param patterns - Matched scam patterns
   * @param message - Normalized message text
   * @returns Confidence score (0-100)
   */
  private calculateConfidence(patterns: ScamPattern[], message: string): number {
    let confidence = 50; // Base confidence

    // Increase confidence with more matches
    confidence += Math.min(patterns.length * 10, 30);

    // Increase confidence for high-risk patterns
    const highRiskCount = patterns.filter(p => 
      p.riskLevel === 'CRITICAL' || p.riskLevel === 'HIGH'
    ).length;
    confidence += highRiskCount * 5;

    // Increase confidence for clear scam indicators
    const scamIndicators = [
      'click here', 'urgent', 'suspended', 'blocked', 'arrest', 'police',
      'pay now', 'transfer', 'fee', 'penalty', 'kyc', 'aadhaar', 'pan'
    ];
    const indicatorCount = scamIndicators.filter(indicator => 
      message.includes(indicator)
    ).length;
    confidence += Math.min(indicatorCount * 3, 20);

    return Math.min(confidence, 100);
  }


    /**
     * Verify a phone number against telemarketer registry and verified brands
     * @param phoneNumber - Phone number to verify (Indian format)
     * @param userId - User ID for audit logging
     * @returns Phone verification result with DND status and brand info
     */
    async verifyPhoneNumber(phoneNumber: string, userId: string): Promise<PhoneVerification> {
      const startTime = Date.now();

      try {
        // Normalize phone number (remove spaces, dashes)
        const normalizedPhone = phoneNumber.replace(/[\s-]/g, '');

        // Check telemarketer registry
        const registryEntry = await prisma.telemarketerRegistry.findUnique({
          where: { phoneNumber: normalizedPhone },
        });

        // Check verified brands
        let brandInfo = null;
        if (registryEntry?.brandName) {
          brandInfo = await prisma.verifiedBrand.findFirst({
            where: { brandName: registryEntry.brandName },
          });
        }

        // Build verification result
        const verification: PhoneVerification = {
          isVerified: registryEntry?.isVerified || false,
          isDND: registryEntry?.isDnd || false,
          isKnownScammer: registryEntry?.isScammer || false,
          brandName: registryEntry?.brandName || undefined,
          officialContacts: brandInfo?.officialContacts as any || undefined,
          warnings: [],
        };

        // Generate warnings
        if (verification.isKnownScammer) {
          verification.warnings.push(
            '⚠️ WARNING: This number has been reported as a scammer. Do not share personal or financial information.'
          );
          verification.warnings.push(
            '🚨 Block this number immediately and report to TRAI Chakshu if you received a suspicious call.'
          );
        }

        if (!verification.isVerified && !verification.isKnownScammer) {
          verification.warnings.push(
            '⚠️ This number is not verified in our database. Exercise caution when sharing information.'
          );
        }

        if (verification.isDND) {
          verification.warnings.push(
            'ℹ️ This number is registered on TRAI DND (Do Not Disturb) registry.'
          );
        }

        if (verification.isVerified && verification.brandName) {
          verification.warnings.push(
            `✅ Verified: This number belongs to ${verification.brandName}.`
          );
          if (verification.officialContacts) {
            verification.warnings.push(
              `📞 Official contacts: ${JSON.stringify(verification.officialContacts)}`
            );
          }
        }

        const duration = Date.now() - startTime;
        logger.info('Phone verification completed', {
          userId,
          phoneNumber: normalizedPhone,
          isVerified: verification.isVerified,
          isScammer: verification.isKnownScammer,
          duration,
        });

        return verification;
      } catch (error) {
        logger.error('Error verifying phone number', { error, userId, phoneNumber });
        throw error;
      }
    }

}

export const scamShieldService = new ScamShieldService();
