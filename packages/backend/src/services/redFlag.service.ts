import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import * as policyPulseService from './policyPulse.service';

const prisma = new PrismaClient();

export type RedFlagType =
  | 'EXCESSIVE_EXCLUSIONS'
  | 'LONG_WAITING_PERIOD'
  | 'LOW_SUB_LIMITS'
  | 'HIGH_PREMIUM'
  | 'SHORT_TERM'
  | 'HIGH_COPAYMENT'
  | 'LOW_ROOM_RENT'
  | 'MISSING_COMMISSION'
  | 'RESTRICTIVE_COVERAGE'
  | 'UNCLEAR_TERMS';

export type RedFlagSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
export type OverallRisk = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RedFlag {
  type: RedFlagType;
  severity: RedFlagSeverity;
  description: string;
  policyClause: string;
  recommendation: string;
  value?: number | string;
}

export interface RedFlagReport {
  policyId: string;
  overallRisk: OverallRisk;
  redFlags: RedFlag[];
  recommendations: string[];
  misSellingSuspicion: boolean;
  analysisDate: Date;
}

/**
 * Rule 1: Check for excessive exclusions (>15 major exclusions)
 */
function checkExcessiveExclusions(policy: policyPulseService.ParsedPolicy): RedFlag | null {
  const exclusionCount = policy.sections.exclusions.length;

  if (exclusionCount > 15) {
    return {
      type: 'EXCESSIVE_EXCLUSIONS',
      severity: exclusionCount > 25 ? 'HIGH' : exclusionCount > 20 ? 'MEDIUM' : 'LOW',
      description: `Policy has ${exclusionCount} exclusions, which is excessive and limits coverage significantly`,
      policyClause: 'Exclusions Section',
      recommendation: 'Review all exclusions carefully. Consider policies with fewer exclusions for better coverage.',
      value: exclusionCount,
    };
  }

  return null;
}

/**
 * Rule 2: Check for long waiting periods (>4 years for pre-existing conditions)
 */
function checkLongWaitingPeriods(policy: policyPulseService.ParsedPolicy): RedFlag[] {
  const flags: RedFlag[] = [];

  for (const wp of policy.extractedData.waitingPeriods) {
    const periodText = wp.period.toLowerCase();
    
    // Extract years from period text
    let years = 0;
    if (periodText.includes('year')) {
      const match = periodText.match(/(\d+)\s*year/);
      if (match) {
        years = parseInt(match[1], 10);
      }
    }

    if (years > 4) {
      flags.push({
        type: 'LONG_WAITING_PERIOD',
        severity: years > 6 ? 'HIGH' : years > 5 ? 'MEDIUM' : 'LOW',
        description: `Waiting period of ${wp.period} for ${wp.condition} exceeds industry norms`,
        policyClause: `Waiting Period - ${wp.condition}`,
        recommendation: 'Long waiting periods delay coverage. Look for policies with shorter waiting periods.',
        value: wp.period,
      });
    }
  }

  return flags;
}

/**
 * Rule 3: Check for restrictive sub-limits (<30% of sum assured for critical illnesses)
 */
function checkRestrictiveSubLimits(policy: policyPulseService.ParsedPolicy): RedFlag[] {
  const flags: RedFlag[] = [];
  const sumAssured = policy.metadata.sumAssured || 0;

  if (sumAssured === 0) {
    return flags;
  }

  for (const subLimit of policy.extractedData.subLimits) {
    const limitPercentage = (subLimit.limit / sumAssured) * 100;

    // Check for critical illness or major treatment sub-limits
    const isCritical =
      subLimit.item.toLowerCase().includes('critical') ||
      subLimit.item.toLowerCase().includes('cancer') ||
      subLimit.item.toLowerCase().includes('heart') ||
      subLimit.item.toLowerCase().includes('kidney') ||
      subLimit.item.toLowerCase().includes('surgery');

    if (isCritical && limitPercentage < 30) {
      flags.push({
        type: 'LOW_SUB_LIMITS',
        severity: limitPercentage < 15 ? 'HIGH' : limitPercentage < 20 ? 'MEDIUM' : 'LOW',
        description: `Sub-limit for ${subLimit.item} is only ${limitPercentage.toFixed(1)}% of sum assured (₹${subLimit.limit.toLocaleString('en-IN')})`,
        policyClause: `Sub-limits - ${subLimit.item}`,
        recommendation: 'Low sub-limits can leave you underinsured for major treatments. Seek policies with higher sub-limits.',
        value: `${limitPercentage.toFixed(1)}%`,
      });
    }
  }

  return flags;
}

/**
 * Rule 4: Check for high premium (>25% above market average)
 * Note: This is a simplified check. In production, compare against market data.
 */
function checkHighPremium(policy: policyPulseService.ParsedPolicy): RedFlag | null {
  const premium = policy.metadata.premium || 0;
  const sumAssured = policy.metadata.sumAssured || 0;

  if (premium === 0 || sumAssured === 0) {
    return null;
  }

  // Calculate premium as percentage of sum assured
  const premiumPercentage = (premium / sumAssured) * 100;

  // Typical health insurance premium is 1-3% of sum assured
  // Flag if premium is >4% (indicating >25% above typical 3%)
  if (premiumPercentage > 4) {
    return {
      type: 'HIGH_PREMIUM',
      severity: premiumPercentage > 6 ? 'HIGH' : premiumPercentage > 5 ? 'MEDIUM' : 'LOW',
      description: `Premium of ₹${premium.toLocaleString('en-IN')} is ${premiumPercentage.toFixed(1)}% of sum assured, which is significantly higher than market average`,
      policyClause: 'Premium Details',
      recommendation: 'High premiums may indicate overpricing. Compare with similar policies from other insurers.',
      value: `${premiumPercentage.toFixed(1)}%`,
    };
  }

  return null;
}

/**
 * Rule 5: Check for short policy terms (<5 years for health insurance)
 */
function checkShortTerm(policy: policyPulseService.ParsedPolicy): RedFlag | null {
  const issueDate = policy.metadata.issueDate;
  const expiryDate = policy.metadata.expiryDate;

  if (!issueDate || !expiryDate) {
    return null;
  }

  const durationYears = (expiryDate.getTime() - issueDate.getTime()) / (365 * 24 * 60 * 60 * 1000);

  // For health insurance, terms should typically be 1 year (renewable) or longer
  // Flag if term is unusually short (< 6 months)
  if (durationYears < 0.5) {
    return {
      type: 'SHORT_TERM',
      severity: 'MEDIUM',
      description: `Policy term of ${(durationYears * 12).toFixed(0)} months is unusually short`,
      policyClause: 'Policy Term',
      recommendation: 'Short policy terms may indicate limited coverage or frequent renewal hassles.',
      value: `${(durationYears * 12).toFixed(0)} months`,
    };
  }

  return null;
}

/**
 * Rule 6: Check for high co-payment (>30%)
 */
function checkHighCoPayment(policy: policyPulseService.ParsedPolicy): RedFlag | null {
  const coPayment = policy.extractedData.coPayment;

  if (coPayment === null || coPayment === undefined) {
    return null;
  }

  if (coPayment > 30) {
    return {
      type: 'HIGH_COPAYMENT',
      severity: coPayment > 50 ? 'HIGH' : coPayment > 40 ? 'MEDIUM' : 'LOW',
      description: `Co-payment of ${coPayment}% means you pay a significant portion of claim costs out-of-pocket`,
      policyClause: 'Co-payment Clause',
      recommendation: 'High co-payment reduces effective coverage. Look for policies with lower or no co-payment.',
      value: `${coPayment}%`,
    };
  }

  return null;
}

/**
 * Rule 7: Check for low room rent limits (<1% of sum assured per day)
 */
function checkLowRoomRent(policy: policyPulseService.ParsedPolicy): RedFlag | null {
  const roomRentLimit = policy.extractedData.roomRentLimit;
  const sumAssured = policy.metadata.sumAssured || 0;

  if (!roomRentLimit || sumAssured === 0) {
    return null;
  }

  const dailyLimitPercentage = (roomRentLimit / sumAssured) * 100;

  // Room rent should typically be at least 1% of sum assured per day
  if (dailyLimitPercentage < 1) {
    return {
      type: 'LOW_ROOM_RENT',
      severity: dailyLimitPercentage < 0.5 ? 'HIGH' : dailyLimitPercentage < 0.75 ? 'MEDIUM' : 'LOW',
      description: `Room rent limit of ₹${roomRentLimit.toLocaleString('en-IN')}/day is only ${dailyLimitPercentage.toFixed(2)}% of sum assured`,
      policyClause: 'Room Rent Limits',
      recommendation: 'Low room rent limits can force you into lower-quality hospital rooms or trigger proportionate deductions.',
      value: `₹${roomRentLimit.toLocaleString('en-IN')}/day`,
    };
  }

  return null;
}

/**
 * Rule 8: Check for missing commission disclosure
 * Note: This would require parsing policy documents for commission information
 */
function checkMissingCommission(policy: policyPulseService.ParsedPolicy): RedFlag | null {
  // Check if policy document mentions commission
  const hasCommissionInfo =
    policy.sections.terms.toLowerCase().includes('commission') ||
    policy.sections.conditions.toLowerCase().includes('commission');

  if (!hasCommissionInfo) {
    return {
      type: 'MISSING_COMMISSION',
      severity: 'LOW',
      description: 'Policy document does not disclose agent commission, which affects transparency',
      policyClause: 'Terms and Conditions',
      recommendation: 'Ask your agent or insurer about commission rates to understand total costs.',
    };
  }

  return null;
}

/**
 * Analyze policy for all red flags
 */
export async function detectRedFlags(policyId: string, userId: string): Promise<RedFlagReport> {
  try {
    // Get parsed policy
    const policy = await policyPulseService.getParsedPolicy(policyId, userId);

    if (!policy) {
      throw new Error('Policy not found');
    }

    const redFlags: RedFlag[] = [];

    // Run all red flag checks
    const excessiveExclusions = checkExcessiveExclusions(policy);
    if (excessiveExclusions) redFlags.push(excessiveExclusions);

    const longWaitingPeriods = checkLongWaitingPeriods(policy);
    redFlags.push(...longWaitingPeriods);

    const restrictiveSubLimits = checkRestrictiveSubLimits(policy);
    redFlags.push(...restrictiveSubLimits);

    const highPremium = checkHighPremium(policy);
    if (highPremium) redFlags.push(highPremium);

    const shortTerm = checkShortTerm(policy);
    if (shortTerm) redFlags.push(shortTerm);

    const highCoPayment = checkHighCoPayment(policy);
    if (highCoPayment) redFlags.push(highCoPayment);

    const lowRoomRent = checkLowRoomRent(policy);
    if (lowRoomRent) redFlags.push(lowRoomRent);

    const missingCommission = checkMissingCommission(policy);
    if (missingCommission) redFlags.push(missingCommission);

    // Calculate overall risk
    const highSeverityCount = redFlags.filter((f) => f.severity === 'HIGH').length;
    const mediumSeverityCount = redFlags.filter((f) => f.severity === 'MEDIUM').length;

    let overallRisk: OverallRisk = 'LOW';
    if (highSeverityCount >= 2 || redFlags.length >= 5) {
      overallRisk = 'HIGH';
    } else if (highSeverityCount >= 1 || mediumSeverityCount >= 2 || redFlags.length >= 3) {
      overallRisk = 'MEDIUM';
    }

    // Determine mis-selling suspicion (>3 red flags)
    const misSellingSuspicion = redFlags.length > 3;

    // Generate recommendations
    const recommendations: string[] = [];
    if (misSellingSuspicion) {
      recommendations.push(
        'This policy shows multiple red flags indicating potential mis-selling. Consider filing a grievance with IRDAI Bima Bharosa.'
      );
    }
    if (overallRisk === 'HIGH') {
      recommendations.push(
        'This policy has significant issues. We strongly recommend comparing with other policies before proceeding.'
      );
    }
    if (redFlags.some((f) => f.type === 'HIGH_PREMIUM')) {
      recommendations.push('Compare premiums with at least 3 other insurers to ensure fair pricing.');
    }
    if (redFlags.some((f) => f.type === 'EXCESSIVE_EXCLUSIONS')) {
      recommendations.push('Review all exclusions carefully and understand what is NOT covered.');
    }

    const report: RedFlagReport = {
      policyId,
      overallRisk,
      redFlags,
      recommendations,
      misSellingSuspicion,
      analysisDate: new Date(),
    };

    // Store red flags in database
    await storeRedFlags(policyId, userId, report);

    logger.info('Red flag analysis completed', {
      policyId,
      userId,
      redFlagCount: redFlags.length,
      overallRisk,
      misSellingSuspicion,
    });

    return report;
  } catch (error) {
    logger.error('Red flag detection failed', { error, policyId, userId });
    throw new Error('Failed to analyze policy for red flags');
  }
}

/**
 * Store red flags in database
 */
async function storeRedFlags(
  policyId: string,
  userId: string,
  report: RedFlagReport
): Promise<void> {
  try {
    // Delete existing red flags for this policy
    await prisma.redFlag.deleteMany({
      where: { policyId },
    });

    // Create new red flag records
    if (report.redFlags.length > 0) {
      await prisma.redFlag.createMany({
        data: report.redFlags.map((flag) => ({
          policyId,
          flagType: flag.type,
          severity: flag.severity,
          description: flag.description,
          policyClause: flag.policyClause,
          recommendation: flag.recommendation,
        })),
      });
    }

    logger.info('Red flags stored in database', {
      policyId,
      userId,
      count: report.redFlags.length,
    });
  } catch (error) {
    logger.error('Failed to store red flags', { error, policyId, userId });
    // Don't throw - this is not critical
  }
}

/**
 * Get red flag report for a policy
 */
export async function getRedFlagReport(
  policyId: string,
  userId: string
): Promise<RedFlagReport | null> {
  try {
    const redFlags = await prisma.redFlag.findMany({
      where: {
        policyId,
      },
    });

    if (redFlags.length === 0) {
      return null;
    }

    // Reconstruct report from database
    const flags: RedFlag[] = redFlags.map((flag) => ({
      type: flag.flagType as RedFlagType,
      severity: flag.severity as RedFlagSeverity,
      description: flag.description || '',
      policyClause: flag.policyClause || '',
      recommendation: flag.recommendation || '',
    }));

    const highSeverityCount = flags.filter((f) => f.severity === 'HIGH').length;
    const mediumSeverityCount = flags.filter((f) => f.severity === 'MEDIUM').length;

    let overallRisk: OverallRisk = 'LOW';
    if (highSeverityCount >= 2 || flags.length >= 5) {
      overallRisk = 'HIGH';
    } else if (highSeverityCount >= 1 || mediumSeverityCount >= 2 || flags.length >= 3) {
      overallRisk = 'MEDIUM';
    }

    const misSellingSuspicion = flags.length > 3;

    const recommendations: string[] = [];
    if (misSellingSuspicion) {
      recommendations.push(
        'This policy shows multiple red flags indicating potential mis-selling. Consider filing a grievance with IRDAI Bima Bharosa.'
      );
    }
    if (overallRisk === 'HIGH') {
      recommendations.push(
        'This policy has significant issues. We strongly recommend comparing with other policies before proceeding.'
      );
    }

    return {
      policyId,
      overallRisk,
      redFlags: flags,
      recommendations,
      misSellingSuspicion,
      analysisDate: redFlags[0].detectedAt,
    };
  } catch (error) {
    logger.error('Failed to get red flag report', { error, policyId, userId });
    return null;
  }
}
