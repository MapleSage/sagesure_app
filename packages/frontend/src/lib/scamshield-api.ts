/**
 * ScamShield API client functions
 */
import { api } from './api';

export interface ScamAnalysis {
  riskScore: number;
  isScam: boolean;
  matchedPatterns: string[];
  warnings: string[];
  recommendations: string[];
  confidence: number;
}

export interface PhoneVerification {
  isVerified: boolean;
  isDND: boolean;
  isKnownScammer: boolean;
  brandName?: string;
  warnings: string[];
}

export interface DeepfakeAnalysis {
  isDeepfake: boolean;
  confidence: number;
  anomalies: {
    facialInconsistencies: string[];
    audioVisualSync: boolean;
    backgroundAnomalies: string[];
  };
  suspiciousFrames: number[];
}

export async function analyzeMessage(message: string): Promise<ScamAnalysis> {
  const { data } = await api.post('/scamshield/analyze-message', { message });
  return data.data;
}

export async function verifyPhone(phoneNumber: string): Promise<PhoneVerification> {
  const { data } = await api.post('/scamshield/verify-phone', { phoneNumber });
  return data.data;
}

export async function analyzeVideo(file: File): Promise<{ incidentId: string; analysis: DeepfakeAnalysis }> {
  const formData = new FormData();
  formData.append('video', file);
  const { data } = await api.post('/scamshield/analyze-video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  });
  return data.data;
}
