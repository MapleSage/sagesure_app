import * as pdfParse from 'pdf-parse';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface ParsedPolicy {
  policyId: string;
  metadata: {
    insurerName: string;
    policyNumber: string;
    policyType: string;
    issueDate: Date | null;
    expiryDate: Date | null;
    sumAssured: number | null;
    premium: number | null;
  };
  sections: {
    coverage: string;
    exclusions: string[];
    terms: string;
    conditions: string;
  };
  extractedData: {
    waitingPeriods: Array<{ condition: string; period: string }>;
    subLimits: Array<{ item: string; limit: number }>;
    coPayment: number | null;
    roomRentLimit: number | null;
  };
}

export interface PolicyUploadResult {
  policyId: string;
  status: 'success' | 'partial' | 'failed';
  message: string;
  parsedPolicy?: ParsedPolicy;
  missingFields?: string[];
  anomalies?: string[];
}

/**
 * Extract text from PDF buffer
 */
export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  try {
    const startTime = Date.now();
    const data = await (pdfParse as any).default(pdfBuffer);
    const duration = Date.now() - startTime;

    logger.info('PDF text extraction completed', {
      pages: data.numpages,
      textLength: data.text.length,
      duration,
    });

    return data.text;
  } catch (error) {
    logger.error('PDF text extraction failed', { error });
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Parse policy metadata from extracted text
 */
export function parseMetadata(text: string): ParsedPolicy['metadata'] {
  const metadata: ParsedPolicy['metadata'] = {
    insurerName: '',
    policyNumber: '',
    policyType: 'HEALTH',
    issueDate: null,
    expiryDate: null,
    sumAssured: null,
    premium: null,
  };

  // Extract insurer name (common patterns)
  const insurerPatterns = [
    /(?:issued by|insurer|company name)[:\s]+([A-Za-z\s&]+(?:Insurance|Life|General))/i,
    /(HDFC|ICICI|SBI|LIC|Max|Bajaj|Star|Care|Niva Bupa|Aditya Birla)[A-Za-z\s]*(?:Insurance|Life|General)/i,
  ];
  for (const pattern of insurerPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.insurerName = match[1].trim();
      break;
    }
  }

  // Extract policy number
  const policyNumberPatterns = [
    /policy\s*(?:no|number|#)[:\s]*([A-Z0-9/-]+)/i,
    /certificate\s*(?:no|number)[:\s]*([A-Z0-9/-]+)/i,
  ];
  for (const pattern of policyNumberPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.policyNumber = match[1].trim();
      break;
    }
  }

  // Extract issue date
  const issueDatePatterns = [
    /(?:issue|commencement|start)\s*date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(?:issued on|effective from)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
  ];
  for (const pattern of issueDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.issueDate = parseDate(match[1]);
      break;
    }
  }

  // Extract expiry date
  const expiryDatePatterns = [
    /(?:expiry|expiration|end)\s*date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
    /(?:valid till|expires on)[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i,
  ];
  for (const pattern of expiryDatePatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.expiryDate = parseDate(match[1]);
      break;
    }
  }

  // Extract sum assured
  const sumAssuredPatterns = [
    /sum\s*assured[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i,
    /coverage\s*amount[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i,
  ];
  for (const pattern of sumAssuredPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.sumAssured = parseAmount(match[1]);
      break;
    }
  }

  // Extract premium
  const premiumPatterns = [
    /(?:annual|yearly|total)\s*premium[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i,
    /premium\s*amount[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i,
  ];
  for (const pattern of premiumPatterns) {
    const match = text.match(pattern);
    if (match) {
      metadata.premium = parseAmount(match[1]);
      break;
    }
  }

  return metadata;
}

/**
 * Parse policy sections from extracted text
 */
export function parseSections(text: string): ParsedPolicy['sections'] {
  const sections: ParsedPolicy['sections'] = {
    coverage: '',
    exclusions: [],
    terms: '',
    conditions: '',
  };

  // Extract coverage section
  const coverageMatch = text.match(/(?:coverage|benefits|what is covered)[:\s]+([\s\S]{0,2000}?)(?=exclusions|terms|conditions|$)/i);
  if (coverageMatch) {
    sections.coverage = coverageMatch[1].trim();
  }

  // Extract exclusions
  const exclusionsMatch = text.match(/(?:exclusions|what is not covered|limitations)[:\s]+([\s\S]{0,2000}?)(?=terms|conditions|coverage|$)/i);
  if (exclusionsMatch) {
    const exclusionsText = exclusionsMatch[1];
    // Split by bullet points, numbers, or newlines
    sections.exclusions = exclusionsText
      .split(/[\n•\-\d+\.]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 10 && e.length < 500);
  }

  // Extract terms
  const termsMatch = text.match(/(?:terms and conditions|policy terms)[:\s]+([\s\S]{0,2000}?)(?=exclusions|conditions|coverage|$)/i);
  if (termsMatch) {
    sections.terms = termsMatch[1].trim();
  }

  // Extract conditions
  const conditionsMatch = text.match(/(?:general conditions|special conditions)[:\s]+([\s\S]{0,2000}?)(?=exclusions|terms|coverage|$)/i);
  if (conditionsMatch) {
    sections.conditions = conditionsMatch[1].trim();
  }

  return sections;
}

/**
 * Extract additional policy data
 */
export function extractAdditionalData(text: string): ParsedPolicy['extractedData'] {
  const extractedData: ParsedPolicy['extractedData'] = {
    waitingPeriods: [],
    subLimits: [],
    coPayment: null,
    roomRentLimit: null,
  };

  // Extract waiting periods
  const waitingPeriodMatches = text.matchAll(/waiting\s*period[:\s]*(\d+)\s*(days?|months?|years?)\s*(?:for\s+)?([^.\n]+)/gi);
  for (const match of waitingPeriodMatches) {
    extractedData.waitingPeriods.push({
      condition: match[3]?.trim() || 'General',
      period: `${match[1]} ${match[2]}`,
    });
  }

  // Extract sub-limits
  const subLimitMatches = text.matchAll(/([A-Za-z\s]+)(?:limited to|capped at|maximum)[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+)/gi);
  for (const match of subLimitMatches) {
    const item = match[1].trim();
    const limit = parseAmount(match[2]);
    if (limit && item.length < 100) {
      extractedData.subLimits.push({ item, limit });
    }
  }

  // Extract co-payment
  const coPaymentMatch = text.match(/co-?payment[:\s]*(\d+)%/i);
  if (coPaymentMatch) {
    extractedData.coPayment = parseInt(coPaymentMatch[1], 10);
  }

  // Extract room rent limit
  const roomRentMatch = text.match(/room\s*rent[:\s]*(?:Rs\.?|INR|₹)?\s*([\d,]+)/i);
  if (roomRentMatch) {
    extractedData.roomRentLimit = parseAmount(roomRentMatch[1]);
  }

  return extractedData;
}

/**
 * Validate parsed policy data
 */
export function validatePolicyData(parsedPolicy: ParsedPolicy): {
  isValid: boolean;
  anomalies: string[];
  missingCriticalFields: string[];
} {
  const anomalies: string[] = [];
  const missingCriticalFields: string[] = [];

  // Check critical fields
  if (!parsedPolicy.metadata.insurerName || parsedPolicy.metadata.insurerName === 'Unknown') {
    missingCriticalFields.push('insurerName');
  }
  if (!parsedPolicy.metadata.policyNumber || parsedPolicy.metadata.policyNumber === 'UNKNOWN') {
    missingCriticalFields.push('policyNumber');
  }
  if (!parsedPolicy.metadata.sumAssured) {
    missingCriticalFields.push('sumAssured');
  }

  // Check for anomalies in values
  if (parsedPolicy.metadata.sumAssured && parsedPolicy.metadata.sumAssured < 10000) {
    anomalies.push('Sum assured is unusually low (< ₹10,000)');
  }
  if (parsedPolicy.metadata.sumAssured && parsedPolicy.metadata.sumAssured > 100000000) {
    anomalies.push('Sum assured is unusually high (> ₹10 crore)');
  }

  if (parsedPolicy.metadata.premium && parsedPolicy.metadata.premium < 100) {
    anomalies.push('Premium is unusually low (< ₹100)');
  }
  if (parsedPolicy.metadata.premium && parsedPolicy.metadata.premium > 1000000) {
    anomalies.push('Premium is unusually high (> ₹10 lakh)');
  }

  // Check premium to sum assured ratio
  if (parsedPolicy.metadata.premium && parsedPolicy.metadata.sumAssured) {
    const ratio = (parsedPolicy.metadata.premium / parsedPolicy.metadata.sumAssured) * 100;
    if (ratio > 25) {
      anomalies.push(`Premium is very high relative to sum assured (${ratio.toFixed(1)}%)`);
    }
  }

  // Check dates
  if (parsedPolicy.metadata.issueDate && parsedPolicy.metadata.expiryDate) {
    const issueTime = parsedPolicy.metadata.issueDate.getTime();
    const expiryTime = parsedPolicy.metadata.expiryDate.getTime();
    
    if (expiryTime <= issueTime) {
      anomalies.push('Expiry date is before or same as issue date');
    }

    const durationYears = (expiryTime - issueTime) / (365 * 24 * 60 * 60 * 1000);
    if (durationYears < 0.5) {
      anomalies.push('Policy duration is unusually short (< 6 months)');
    }
    if (durationYears > 50) {
      anomalies.push('Policy duration is unusually long (> 50 years)');
    }
  }

  // Check co-payment
  if (parsedPolicy.extractedData.coPayment && parsedPolicy.extractedData.coPayment > 50) {
    anomalies.push(`Co-payment is very high (${parsedPolicy.extractedData.coPayment}%)`);
  }

  // Check exclusions count
  if (parsedPolicy.sections.exclusions.length > 20) {
    anomalies.push(`Excessive number of exclusions (${parsedPolicy.sections.exclusions.length})`);
  }

  // Check waiting periods
  for (const wp of parsedPolicy.extractedData.waitingPeriods) {
    if (wp.period.includes('year')) {
      const years = parseInt(wp.period);
      if (years > 4) {
        anomalies.push(`Long waiting period: ${wp.period} for ${wp.condition}`);
      }
    }
  }

  const isValid = missingCriticalFields.length === 0;

  return {
    isValid,
    anomalies,
    missingCriticalFields,
  };
}

/**
 * Upload and parse policy PDF
 */
export async function uploadPolicy(
  userId: string,
  pdfBuffer: Buffer,
  filename: string
): Promise<PolicyUploadResult> {
  try {
    // Extract text from PDF
    const text = await extractTextFromPDF(pdfBuffer);

    // Parse metadata
    const metadata = parseMetadata(text);

    // Parse sections
    const sections = parseSections(text);

    // Extract additional data
    const extractedData = extractAdditionalData(text);

    // Validate critical fields
    const missingFields: string[] = [];
    if (!metadata.insurerName) missingFields.push('insurerName');
    if (!metadata.policyNumber) missingFields.push('policyNumber');
    if (!metadata.sumAssured) missingFields.push('sumAssured');

    // Determine policy type based on content
    const policyType = determinePolicyType(text);

    // Store in database
    const policy = await prisma.policy.create({
      data: {
        userId,
        insurerName: metadata.insurerName || 'Unknown',
        policyNumber: metadata.policyNumber || 'UNKNOWN',
        policyType,
        issueDate: metadata.issueDate,
        expiryDate: metadata.expiryDate,
        sumAssured: metadata.sumAssured,
        premium: metadata.premium,
        originalPdfUrl: filename, // In production, this would be Azure Blob Storage URL
        parsedData: {
          metadata,
          sections,
          extractedData,
          rawText: text.substring(0, 5000), // Store first 5000 chars for reference
        },
      },
    });

    const parsedPolicy: ParsedPolicy = {
      policyId: policy.id,
      metadata,
      sections,
      extractedData,
    };

    // Validate policy data
    const validation = validatePolicyData(parsedPolicy);

    const status = missingFields.length > 0 ? 'partial' : 'success';
    const message =
      status === 'partial'
        ? `Policy parsed with missing fields: ${missingFields.join(', ')}`
        : 'Policy parsed successfully';

    logger.info('Policy uploaded and parsed', {
      policyId: policy.id,
      userId,
      status,
      missingFields,
      anomalies: validation.anomalies,
    });

    return {
      policyId: policy.id,
      status,
      message,
      parsedPolicy,
      missingFields: missingFields.length > 0 ? missingFields : undefined,
      anomalies: validation.anomalies.length > 0 ? validation.anomalies : undefined,
    } as any;
  } catch (error) {
    logger.error('Policy upload failed', { error, userId });
    return {
      policyId: '',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get parsed policy by ID
 */
export async function getParsedPolicy(policyId: string, userId: string): Promise<ParsedPolicy | null> {
  const policy = await prisma.policy.findFirst({
    where: {
      id: policyId,
      userId,
    },
  });

  if (!policy) {
    return null;
  }

  const parsedData = policy.parsedData as any;

  return {
    policyId: policy.id,
    metadata: parsedData.metadata || {
      insurerName: policy.insurerName,
      policyNumber: policy.policyNumber,
      policyType: policy.policyType,
      issueDate: policy.issueDate,
      expiryDate: policy.expiryDate,
      sumAssured: policy.sumAssured,
      premium: policy.premium,
    },
    sections: parsedData.sections || {
      coverage: '',
      exclusions: [],
      terms: '',
      conditions: '',
    },
    extractedData: parsedData.extractedData || {
      waitingPeriods: [],
      subLimits: [],
      coPayment: null,
      roomRentLimit: null,
    },
  };
}

// Helper functions

function parseDate(dateStr: string): Date | null {
  try {
    // Handle DD/MM/YYYY, DD-MM-YYYY formats
    const parts = dateStr.split(/[/-]/);
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed
      let year = parseInt(parts[2], 10);
      
      // Handle 2-digit years
      if (year < 100) {
        year += year < 50 ? 2000 : 1900;
      }
      
      return new Date(year, month, day);
    }
    return null;
  } catch {
    return null;
  }
}

function parseAmount(amountStr: string): number | null {
  try {
    // Remove commas and parse
    const cleaned = amountStr.replace(/,/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? null : amount;
  } catch {
    return null;
  }
}

function determinePolicyType(text: string): string {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('health') || lowerText.includes('medical') || lowerText.includes('mediclaim')) {
    return 'HEALTH';
  }
  if (lowerText.includes('life insurance') || lowerText.includes('term insurance')) {
    return 'LIFE';
  }
  if (lowerText.includes('motor') || lowerText.includes('vehicle') || lowerText.includes('car') || lowerText.includes('two wheeler')) {
    return 'MOTOR';
  }
  if (lowerText.includes('travel')) {
    return 'TRAVEL';
  }
  
  return 'OTHER';
}
