/**
 * Policy Pulse API client functions
 */
import { api } from './api';

export interface ParsedPolicy {
  policyId: string;
  metadata: {
    insurerName: string;
    policyNumber: string;
    policyType: string;
    issueDate: string | null;
    expiryDate: string | null;
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

export interface PolicySummary {
  policyId: string;
  language: string;
  summary: string;
  keyPoints: string[];
  exclusionsHighlight: string[];
  simplifiedTerms: Record<string, string>;
  disclaimer: string;
}

export interface RedFlag {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  policyClause: string;
  recommendation: string;
}

export interface RedFlagReport {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  redFlags: RedFlag[];
  recommendations: string[];
  misSellingSuspicion: boolean;
}

export interface ComparisonReport {
  userPolicy: { insurerName: string; premium: number; sumAssured: number };
  similarPolicies: Array<{ insurerName: string; premium: number; sumAssured: number; claimSettlementRatio: number }>;
  comparison: {
    premiumDifference: number;
    coverageGaps: string[];
    betterFeatures: string[];
    worseFeatures: string[];
  };
  switchingRecommendation: {
    shouldSwitch: boolean;
    estimatedSavings?: number;
    improvedCoverage?: string[];
  };
}

export async function uploadPolicy(file: File): Promise<{ policyId: string; parsedPolicy: ParsedPolicy; status: string }> {
  const formData = new FormData();
  formData.append('policy', file);
  const { data } = await api.post('/policy-pulse/upload-policy', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 30000,
  });
  return data;
}

export async function getPolicy(policyId: string): Promise<ParsedPolicy> {
  const { data } = await api.get(`/policy-pulse/policy/${policyId}`);
  return data.policy;
}

export async function generateSummary(policyId: string, language: string): Promise<PolicySummary> {
  const { data } = await api.post(`/policy-pulse/generate-summary/${policyId}`, { language });
  return data.summary;
}

export async function getRedFlags(policyId: string): Promise<RedFlagReport> {
  const { data } = await api.get(`/policy-pulse/red-flags/${policyId}`);
  return data.report;
}

export async function comparePolicy(policyId: string): Promise<ComparisonReport> {
  const { data } = await api.post(`/policy-pulse/compare/${policyId}`);
  return data.report;
}

export async function askQuestion(policyId: string, question: string, language: string): Promise<{ answer: string }> {
  const { data } = await api.post('/policy-pulse/ask-question', { policyId, question, language });
  return data.answer;
}
