/**
 * ScamShield Module Types
 * Types for scam detection, analysis, and reporting
 */

export interface ScamAnalysis {
  riskScore: number;        // 0-100
  isScam: boolean;          // true if riskScore > 70
  matchedPatterns: string[];
  warnings: string[];
  recommendations: string[];
  confidence: number;       // 0-100
}

export interface ScamPattern {
  id: string;
  patternText: string;
  patternCategory: string;
  riskLevel: string;
  keywords: string[];
  regexPattern: string | null;
}

export interface DeepfakeAnalysis {
  isDeepfake: boolean;
  confidence: number;       // 0-100
  anomalies: {
    facialInconsistencies: string[];
    audioVisualSync: boolean;
    backgroundAnomalies: string[];
  };
  suspiciousFrames: number[];
}

export interface PhoneVerification {
  isVerified: boolean;
  isDND: boolean;
  isKnownScammer: boolean;
  brandName?: string;
  officialContacts?: {
    phone?: string[];
    email?: string[];
    website?: string;
    socialMedia?: Record<string, string>;
  };
  warnings: string[];
}

export interface ScamIncident {
  userId: string;
  scamType: string;
  dateTime: Date;
  scammerContact: string;
  amountInvolved?: number;
  description: string;
  evidence: string[];      // URLs to uploaded evidence
}

export interface ReportStatus {
  success: boolean;
  referenceNumber?: string;
  message: string;
}

export interface ScamAlert {
  alertType: string;
  message: string;
  riskScore: number;
  timestamp: Date;
}

export interface BrandVerification {
  isVerified: boolean;
  brandName: string;
  officialContacts?: {
    phone: string[];
    email: string[];
    website: string;
    socialMedia?: Record<string, string>;
  };
  verificationStatus: string;
}
