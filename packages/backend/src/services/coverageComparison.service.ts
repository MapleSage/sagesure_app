import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import * as policyPulseService from './policyPulse.service';

const prisma = new PrismaClient();

/**
 * Standardized coverage ontology for normalizing policy features
 */
export interface PolicyOntology {
  policyId: string;
  coverageFeatures: {
    hospitalization: boolean;
    preHospitalization: boolean;
    postHospitalization: boolean;
    dayCare: boolean;
    ambulance: boolean;
    healthCheckup: boolean;
    maternityBenefit: boolean;
    newbornCoverage: boolean;
    organDonor: boolean;
    modernTreatments: boolean;
    ayush: boolean;
    mentalHealth: boolean;
    homeHealthcare: boolean;
    airAmbulance: boolean;
  };
  exclusions: string[];
  waitingPeriods: {
    initial: number; // days
    preExisting: number; // days
    specificDiseases: number; // days
  };
  subLimits: {
    roomRent: number | null;
    icuCharges: number | null;
    criticalIllness: number | null;
    cataract: number | null;
    jointReplacement: number | null;
  };
  coPayment: number | null;
  claimSettlementRatio: number | null;
}

export interface PolicySummary {
  policyId: string;
  insurerName: string;
  policyNumber: string;
  policyType: string;
  sumAssured: number;
  premium: number;
  ontology: PolicyOntology;
}

export interface ComparisonReport {
  userPolicy: PolicySummary;
  similarPolicies: PolicySummary[];
  comparison: {
    premiumDifference: {
      min: number;
      max: number;
      average: number;
    };
    coverageGaps: string[];
    betterFeatures: string[];
    worseFeatures: string[];
  };
  switchingRecommendation: {
    shouldSwitch: boolean;
    estimatedSavings?: number;
    improvedCoverage?: string[];
    reason: string;
  };
}

/**
 * Normalize policy data into standardized ontology
 */
export async function normalizePolicyOntology(
  policyId: string,
  userId: string
): Promise<PolicyOntology> {
  try {
    // Get parsed policy
    const policy = await policyPulseService.getParsedPolicy(policyId, userId);
    if (!policy) {
      throw new Error('Policy not found');
    }

    // Extract coverage features from policy text
    const coverageText = policy.sections.coverage.toLowerCase();
    const termsText = policy.sections.terms.toLowerCase();
    const allText = `${coverageText} ${termsText}`;

    const coverageFeatures = {
      hospitalization: allText.includes('hospitalization') || allText.includes('in-patient'),
      preHospitalization: allText.includes('pre-hospitalization') || allText.includes('pre hospitalization'),
      postHospitalization: allText.includes('post-hospitalization') || allText.includes('post hospitalization'),
      dayCare: allText.includes('day care') || allText.includes('daycare'),
      ambulance: allText.includes('ambulance'),
      healthCheckup: allText.includes('health check') || allText.includes('preventive'),
      maternityBenefit: allText.includes('maternity') || allText.includes('pregnancy'),
      newbornCoverage: allText.includes('newborn') || allText.includes('new born'),
      organDonor: allText.includes('organ donor'),
      modernTreatments: allText.includes('robotic') || allText.includes('stem cell'),
      ayush: allText.includes('ayush') || allText.includes('ayurveda'),
      mentalHealth: allText.includes('mental health') || allText.includes('psychiatric'),
      homeHealthcare: allText.includes('home healthcare') || allText.includes('domiciliary'),
      airAmbulance: allText.includes('air ambulance'),
    };

    // Convert waiting periods to days
    const waitingPeriods = {
      initial: 30, // Default 30 days
      preExisting: 1460, // Default 4 years
      specificDiseases: 730, // Default 2 years
    };

    for (const wp of policy.extractedData.waitingPeriods) {
      const periodText = wp.period.toLowerCase();
      let days = 0;

      if (periodText.includes('year')) {
        const match = periodText.match(/(\d+)\s*year/);
        if (match) {
          days = parseInt(match[1], 10) * 365;
        }
      } else if (periodText.includes('month')) {
        const match = periodText.match(/(\d+)\s*month/);
        if (match) {
          days = parseInt(match[1], 10) * 30;
        }
      } else if (periodText.includes('day')) {
        const match = periodText.match(/(\d+)\s*day/);
        if (match) {
          days = parseInt(match[1], 10);
        }
      }

      if (wp.condition.toLowerCase().includes('pre-existing')) {
        waitingPeriods.preExisting = days;
      } else if (wp.condition.toLowerCase().includes('initial')) {
        waitingPeriods.initial = days;
      } else {
        waitingPeriods.specificDiseases = days;
      }
    }

    // Extract sub-limits
    const subLimits = {
      roomRent: policy.extractedData.roomRentLimit,
      icuCharges: null as number | null,
      criticalIllness: null as number | null,
      cataract: null as number | null,
      jointReplacement: null as number | null,
    };

    for (const subLimit of policy.extractedData.subLimits) {
      const item = subLimit.item.toLowerCase();
      if (item.includes('icu')) {
        subLimits.icuCharges = subLimit.limit;
      } else if (item.includes('critical')) {
        subLimits.criticalIllness = subLimit.limit;
      } else if (item.includes('cataract')) {
        subLimits.cataract = subLimit.limit;
      } else if (item.includes('joint') || item.includes('knee')) {
        subLimits.jointReplacement = subLimit.limit;
      }
    }

    const ontology: PolicyOntology = {
      policyId,
      coverageFeatures,
      exclusions: policy.sections.exclusions,
      waitingPeriods,
      subLimits,
      coPayment: policy.extractedData.coPayment,
      claimSettlementRatio: null, // TODO: Fetch from IRDAI data
    };

    // Store in database
    await storeOntology(policyId, ontology);

    logger.info('Policy ontology normalized', { policyId, userId });

    return ontology;
  } catch (error) {
    logger.error('Failed to normalize policy ontology', { error, policyId, userId });
    throw new Error('Failed to normalize policy ontology');
  }
}

/**
 * Store normalized ontology in database
 */
async function storeOntology(policyId: string, ontology: PolicyOntology): Promise<void> {
  try {
    // Check if ontology already exists
    const existing = await prisma.policyOntology.findFirst({
      where: { policyId },
    });

    if (existing) {
      // Update existing
      await prisma.policyOntology.update({
        where: { id: existing.id },
        data: {
          coverageFeatures: ontology.coverageFeatures as any,
          exclusions: ontology.exclusions,
          waitingPeriods: ontology.waitingPeriods as any,
          subLimits: ontology.subLimits as any,
          coPayment: ontology.coPayment,
          roomRentLimit: ontology.subLimits.roomRent,
        },
      });
    } else {
      // Create new
      await prisma.policyOntology.create({
        data: {
          policyId,
          coverageFeatures: ontology.coverageFeatures as any,
          exclusions: ontology.exclusions,
          waitingPeriods: ontology.waitingPeriods as any,
          subLimits: ontology.subLimits as any,
          coPayment: ontology.coPayment,
          roomRentLimit: ontology.subLimits.roomRent,
        },
      });
    }

    logger.info('Policy ontology stored', { policyId });
  } catch (error) {
    logger.error('Failed to store policy ontology', { error, policyId });
    // Don't throw - this is not critical
  }
}

/**
 * Find similar policies for comparison
 */
export async function findSimilarPolicies(
  policyId: string,
  userId: string,
  limit: number = 5
): Promise<PolicySummary[]> {
  try {
    // Get user's policy
    const userPolicy = await policyPulseService.getParsedPolicy(policyId, userId);
    if (!userPolicy) {
      throw new Error('Policy not found');
    }

    // Find similar policies (same type, similar sum assured)
    const sumAssuredMin = (userPolicy.metadata.sumAssured || 0) * 0.8;
    const sumAssuredMax = (userPolicy.metadata.sumAssured || 0) * 1.2;

    const similarPolicies = await prisma.policy.findMany({
      where: {
        id: { not: policyId },
        policyType: userPolicy.metadata.policyType || 'HEALTH',
        sumAssured: {
          gte: sumAssuredMin,
          lte: sumAssuredMax,
        },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Convert to PolicySummary format
    const summaries: PolicySummary[] = [];
    for (const policy of similarPolicies) {
      // Get or create ontology
      let ontology = await prisma.policyOntology.findFirst({
        where: { policyId: policy.id },
      });

      if (!ontology) {
        // Normalize on-the-fly
        await normalizePolicyOntology(policy.id, policy.userId);
        ontology = await prisma.policyOntology.findFirst({
          where: { policyId: policy.id },
        });
      }

      if (ontology) {
        summaries.push({
          policyId: policy.id,
          insurerName: policy.insurerName,
          policyNumber: policy.policyNumber,
          policyType: policy.policyType,
          sumAssured: Number(policy.sumAssured) || 0,
          premium: Number(policy.premium) || 0,
          ontology: {
            policyId: policy.id,
            coverageFeatures: ontology.coverageFeatures as any,
            exclusions: ontology.exclusions,
            waitingPeriods: ontology.waitingPeriods as any,
            subLimits: ontology.subLimits as any,
            coPayment: ontology.coPayment ? Number(ontology.coPayment) : null,
            claimSettlementRatio: null,
          },
        });
      }
    }

    return summaries;
  } catch (error) {
    logger.error('Failed to find similar policies', { error, policyId, userId });
    throw new Error('Failed to find similar policies');
  }
}


/**
 * Compare user's policy against similar policies
 */
export async function comparePolices(
  policyId: string,
  userId: string
): Promise<ComparisonReport> {
  try {
    // Get user's policy
    const userPolicy = await policyPulseService.getParsedPolicy(policyId, userId);
    if (!userPolicy) {
      throw new Error('Policy not found');
    }

    // Normalize user's policy ontology
    const userOntology = await normalizePolicyOntology(policyId, userId);

    // Find similar policies
    const similarPolicies = await findSimilarPolicies(policyId, userId, 10);

    if (similarPolicies.length === 0) {
      throw new Error('No similar policies found for comparison');
    }

    // Create user policy summary
    const userPolicySummary: PolicySummary = {
      policyId,
      insurerName: userPolicy.metadata.insurerName,
      policyNumber: userPolicy.metadata.policyNumber || '',
      policyType: userPolicy.metadata.policyType || 'HEALTH',
      sumAssured: userPolicy.metadata.sumAssured || 0,
      premium: userPolicy.metadata.premium || 0,
      ontology: userOntology,
    };

    // Calculate premium differences
    const premiums = similarPolicies.map((p) => p.premium);
    const premiumDifference = {
      min: Math.min(...premiums),
      max: Math.max(...premiums),
      average: premiums.reduce((a, b) => a + b, 0) / premiums.length,
    };

    // Identify coverage gaps (features in similar policies but not in user's)
    const coverageGaps: string[] = [];
    const betterFeatures: string[] = [];
    const worseFeatures: string[] = [];

    // Compare coverage features
    const featureNames: (keyof PolicyOntology['coverageFeatures'])[] = [
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

    for (const feature of featureNames) {
      const userHasFeature = userOntology.coverageFeatures[feature];
      const othersHaveFeature = similarPolicies.filter(
        (p) => p.ontology.coverageFeatures[feature]
      ).length;

      if (!userHasFeature && othersHaveFeature > similarPolicies.length / 2) {
        coverageGaps.push(formatFeatureName(feature));
      } else if (userHasFeature && othersHaveFeature < similarPolicies.length / 2) {
        betterFeatures.push(formatFeatureName(feature));
      }
    }

    // Compare waiting periods
    const avgPreExistingWaiting =
      similarPolicies.reduce((sum, p) => sum + p.ontology.waitingPeriods.preExisting, 0) /
      similarPolicies.length;

    if (userOntology.waitingPeriods.preExisting > avgPreExistingWaiting * 1.2) {
      worseFeatures.push(
        `Longer waiting period for pre-existing conditions (${Math.round(userOntology.waitingPeriods.preExisting / 365)} years vs avg ${Math.round(avgPreExistingWaiting / 365)} years)`
      );
    } else if (userOntology.waitingPeriods.preExisting < avgPreExistingWaiting * 0.8) {
      betterFeatures.push(
        `Shorter waiting period for pre-existing conditions (${Math.round(userOntology.waitingPeriods.preExisting / 365)} years)`
      );
    }

    // Compare co-payment
    const avgCoPayment =
      similarPolicies
        .filter((p) => p.ontology.coPayment !== null)
        .reduce((sum, p) => sum + (p.ontology.coPayment || 0), 0) /
      similarPolicies.filter((p) => p.ontology.coPayment !== null).length;

    if (userOntology.coPayment && userOntology.coPayment > avgCoPayment * 1.2) {
      worseFeatures.push(`Higher co-payment (${userOntology.coPayment}% vs avg ${Math.round(avgCoPayment)}%)`);
    } else if (userOntology.coPayment && userOntology.coPayment < avgCoPayment * 0.8) {
      betterFeatures.push(`Lower co-payment (${userOntology.coPayment}%)`);
    }

    // Determine switching recommendation
    const userPremium = userPolicySummary.premium;
    const avgPremium = premiumDifference.average;
    const premiumDiffPercent = ((userPremium - avgPremium) / avgPremium) * 100;

    let shouldSwitch = false;
    let estimatedSavings: number | undefined;
    let improvedCoverage: string[] | undefined;
    let reason = '';

    if (premiumDiffPercent > 20 && coverageGaps.length === 0) {
      shouldSwitch = true;
      estimatedSavings = userPremium - avgPremium;
      reason = `Your premium is ${Math.round(premiumDiffPercent)}% higher than similar policies with comparable coverage. You could save ₹${Math.round(estimatedSavings).toLocaleString('en-IN')} annually.`;
    } else if (coverageGaps.length >= 3) {
      shouldSwitch = true;
      improvedCoverage = coverageGaps;
      reason = `Your policy is missing ${coverageGaps.length} important coverage features that are commonly available in similar policies.`;
    } else if (premiumDiffPercent > 20 && coverageGaps.length > 0) {
      shouldSwitch = true;
      estimatedSavings = userPremium - avgPremium;
      improvedCoverage = coverageGaps;
      reason = `Your policy has both higher premium (${Math.round(premiumDiffPercent)}% above average) and missing coverage features. Switching could save money and improve coverage.`;
    } else {
      reason = 'Your policy offers competitive pricing and coverage compared to similar options.';
    }

    const report: ComparisonReport = {
      userPolicy: userPolicySummary,
      similarPolicies: similarPolicies.slice(0, 5),
      comparison: {
        premiumDifference,
        coverageGaps,
        betterFeatures,
        worseFeatures,
      },
      switchingRecommendation: {
        shouldSwitch,
        estimatedSavings,
        improvedCoverage,
        reason,
      },
    };

    // Store comparison report
    await storeComparisonReport(policyId, report);

    logger.info('Coverage comparison completed', {
      policyId,
      userId,
      shouldSwitch,
      coverageGaps: coverageGaps.length,
    });

    return report;
  } catch (error) {
    logger.error('Failed to compare policies', { error, policyId, userId });
    throw new Error('Failed to compare policies');
  }
}

/**
 * Store comparison report in database
 */
async function storeComparisonReport(
  policyId: string,
  report: ComparisonReport
): Promise<void> {
  try {
    await prisma.coverageComparison.create({
      data: {
        userPolicyId: policyId,
        comparedPolicies: report.similarPolicies.map((p) => ({
          policyId: p.policyId,
          insurerName: p.insurerName,
          premium: p.premium,
        })) as any,
        comparisonData: report.comparison as any,
        recommendation: report.switchingRecommendation as any,
      },
    });

    logger.info('Comparison report stored', { policyId });
  } catch (error) {
    logger.error('Failed to store comparison report', { error, policyId });
    // Don't throw - this is not critical
  }
}

/**
 * Format feature name for display
 */
function formatFeatureName(feature: string): string {
  return feature
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
