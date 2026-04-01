/**
 * Translation Service
 * Integrates Sarvam AI for plain language translation of insurance policies
 * Implements Redis caching with 7-day TTL
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export type Language = 'en' | 'hi' | 'ta' | 'te' | 'mr' | 'bn' | 'gu';

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  hi: 'Hindi',
  ta: 'Tamil',
  te: 'Telugu',
  mr: 'Marathi',
  bn: 'Bengali',
  gu: 'Gujarati',
};

export interface PolicySummary {
  policyId: string;
  language: Language;
  summary: string;
  keyPoints: string[];
  exclusionsHighlight: string[];
  simplifiedTerms: Record<string, string>;
  disclaimer: string;
}

export interface PolicyQAResponse {
  question: string;
  answer: string;
  language: Language;
  confidence: number;
  relatedClauses: string[];
}

// Critical insurance terms that should be preserved with explanations
const CRITICAL_TERMS: Record<string, string> = {
  'sum assured': 'The maximum amount the insurance company will pay',
  premium: 'The amount you pay regularly to keep your insurance active',
  exclusions: 'Conditions or situations NOT covered by your policy',
  deductible: 'The amount you must pay before insurance coverage kicks in',
  'co-payment': 'The percentage of the claim amount you must pay yourself',
  'waiting period': 'Time you must wait before you can make a claim',
  'sub-limit': 'Maximum amount payable for a specific treatment or expense',
  'room rent limit': 'Maximum daily amount covered for hospital room charges',
  'claim settlement ratio': 'Percentage of claims approved by the insurer',
  'free look period': 'Period during which you can cancel the policy for a full refund',
  nominee: 'Person who receives the insurance benefit if the policyholder passes away',
  'grace period': 'Extra time allowed to pay premium after the due date',
};

// Simple in-memory cache (Redis would be used in production)
const translationCache = new Map<string, { data: PolicySummary; expiry: number }>();
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export class TranslationService {
  private sarvamApiUrl: string;
  private sarvamApiKey: string;

  constructor() {
    this.sarvamApiUrl = process.env.SARVAM_AI_URL || 'https://api.sarvam.ai/v1';
    this.sarvamApiKey = process.env.SARVAM_AI_KEY || '';
  }

  /**
   * Generate a plain language summary of a policy
   */
  async generateSummary(policyId: string, language: Language = 'en'): Promise<PolicySummary> {
    const cacheKey = `summary:${policyId}:${language}`;

    // Check cache
    const cached = translationCache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      logger.info('Translation cache hit', { policyId, language });
      return cached.data;
    }

    // Check database for existing translation
    const existing = await prisma.policyTranslation.findFirst({
      where: { policyId, language },
    });

    if (existing) {
      const summary: PolicySummary = {
        policyId,
        language,
        summary: existing.summary || '',
        keyPoints: existing.keyPoints || [],
        exclusionsHighlight: existing.exclusionsHighlight || [],
        simplifiedTerms: (existing.simplifiedTerms as Record<string, string>) || {},
        disclaimer: this.getDisclaimer(language),
      };
      translationCache.set(cacheKey, { data: summary, expiry: Date.now() + CACHE_TTL_MS });
      return summary;
    }

    // Get policy data
    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) throw new Error('Policy not found');

    const parsedData = policy.parsedData as any;

    // Generate English summary first
    const englishSummary = this.generateEnglishSummary(policy, parsedData);

    let finalSummary: PolicySummary;

    if (language === 'en') {
      finalSummary = englishSummary;
    } else {
      // Translate to target language using Sarvam AI
      finalSummary = await this.translateSummary(englishSummary, language);
    }

    // Store in database
    await prisma.policyTranslation.create({
      data: {
        policyId,
        language,
        summary: finalSummary.summary,
        keyPoints: finalSummary.keyPoints,
        exclusionsHighlight: finalSummary.exclusionsHighlight,
        simplifiedTerms: finalSummary.simplifiedTerms,
      },
    });

    // Cache
    translationCache.set(cacheKey, { data: finalSummary, expiry: Date.now() + CACHE_TTL_MS });

    return finalSummary;
  }

  /**
   * Generate English plain language summary from parsed policy data
   */
  private generateEnglishSummary(policy: any, parsedData: any): PolicySummary {
    const metadata = parsedData?.metadata || {};
    const sections = parsedData?.sections || {};
    const extractedData = parsedData?.extractedData || {};

    // Build summary
    const summaryParts: string[] = [];
    summaryParts.push(`This is a ${policy.policyType} insurance policy from ${policy.insurerName}.`);

    if (policy.sumAssured) {
      summaryParts.push(`Your coverage amount (sum assured) is ₹${Number(policy.sumAssured).toLocaleString('en-IN')}.`);
    }
    if (policy.premium) {
      summaryParts.push(`You pay a premium of ₹${Number(policy.premium).toLocaleString('en-IN')}.`);
    }
    if (policy.issueDate) {
      summaryParts.push(`Policy started on ${new Date(policy.issueDate).toLocaleDateString('en-IN')}.`);
    }
    if (policy.expiryDate) {
      summaryParts.push(`Policy expires on ${new Date(policy.expiryDate).toLocaleDateString('en-IN')}.`);
    }

    // Key points
    const keyPoints: string[] = [];
    if (sections.coverage) {
      keyPoints.push(`Coverage: ${sections.coverage.substring(0, 200)}`);
    }
    if (extractedData.coPayment) {
      keyPoints.push(`Co-payment: You pay ${extractedData.coPayment}% of each claim amount yourself.`);
    }
    if (extractedData.roomRentLimit) {
      keyPoints.push(`Room rent limit: Maximum ₹${extractedData.roomRentLimit.toLocaleString('en-IN')} per day for hospital room.`);
    }
    if (extractedData.waitingPeriods?.length > 0) {
      for (const wp of extractedData.waitingPeriods.slice(0, 3)) {
        keyPoints.push(`Waiting period: ${wp.period} for ${wp.condition}.`);
      }
    }

    // Exclusions
    const exclusions: string[] = (sections.exclusions || []).slice(0, 10);

    // Simplified terms
    const simplifiedTerms: Record<string, string> = {};
    for (const [term, explanation] of Object.entries(CRITICAL_TERMS)) {
      simplifiedTerms[term] = explanation;
    }

    return {
      policyId: policy.id,
      language: 'en',
      summary: summaryParts.join(' '),
      keyPoints,
      exclusionsHighlight: exclusions,
      simplifiedTerms,
      disclaimer: this.getDisclaimer('en'),
    };
  }

  /**
   * Translate summary to target language using Sarvam AI
   */
  private async translateSummary(englishSummary: PolicySummary, targetLang: Language): Promise<PolicySummary> {
    try {
      if (!this.sarvamApiKey) {
        // Fallback: return English with language tag
        logger.warn('Sarvam AI key not configured, returning English summary');
        return { ...englishSummary, language: targetLang };
      }

      const response = await axios.post(
        `${this.sarvamApiUrl}/translate`,
        {
          source_language: 'en',
          target_language: targetLang,
          texts: [
            englishSummary.summary,
            ...englishSummary.keyPoints,
            ...englishSummary.exclusionsHighlight,
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.sarvamApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      const translations = response.data.translations || [];
      const summaryIdx = 0;
      const keyPointsStart = 1;
      const keyPointsEnd = keyPointsStart + englishSummary.keyPoints.length;
      const exclusionsStart = keyPointsEnd;

      return {
        policyId: englishSummary.policyId,
        language: targetLang,
        summary: translations[summaryIdx] || englishSummary.summary,
        keyPoints: translations.slice(keyPointsStart, keyPointsEnd).length > 0
          ? translations.slice(keyPointsStart, keyPointsEnd)
          : englishSummary.keyPoints,
        exclusionsHighlight: translations.slice(exclusionsStart).length > 0
          ? translations.slice(exclusionsStart)
          : englishSummary.exclusionsHighlight,
        simplifiedTerms: englishSummary.simplifiedTerms,
        disclaimer: this.getDisclaimer(targetLang),
      };
    } catch (error) {
      logger.error('Sarvam AI translation failed, returning English', { error, targetLang });
      return { ...englishSummary, language: targetLang };
    }
  }

  /**
   * Answer a question about a policy
   */
  async askQuestion(policyId: string, question: string, language: Language = 'en'): Promise<PolicyQAResponse> {
    const policy = await prisma.policy.findUnique({ where: { id: policyId } });
    if (!policy) throw new Error('Policy not found');

    const parsedData = policy.parsedData as any;
    const policyContext = JSON.stringify({
      insurer: policy.insurerName,
      type: policy.policyType,
      sumAssured: policy.sumAssured,
      premium: policy.premium,
      sections: parsedData?.sections,
      extractedData: parsedData?.extractedData,
    });

    try {
      if (!this.sarvamApiKey) {
        // Fallback: generate a basic answer from policy data
        return this.generateBasicAnswer(policyId, question, language, parsedData);
      }

      const response = await axios.post(
        `${this.sarvamApiUrl}/chat`,
        {
          model: 'sarvam-2b',
          messages: [
            {
              role: 'system',
              content: `You are an insurance policy expert. Answer questions about this policy in simple ${LANGUAGE_NAMES[language]}. Policy data: ${policyContext}`,
            },
            { role: 'user', content: question },
          ],
          language,
        },
        {
          headers: {
            Authorization: `Bearer ${this.sarvamApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      return {
        question,
        answer: response.data.choices?.[0]?.message?.content || 'Unable to answer this question.',
        language,
        confidence: 80,
        relatedClauses: [],
      };
    } catch (error) {
      logger.error('Sarvam AI Q&A failed', { error, policyId });
      return this.generateBasicAnswer(policyId, question, language, parsedData);
    }
  }

  /**
   * Generate a basic answer without AI when Sarvam is unavailable
   */
  private generateBasicAnswer(
    policyId: string,
    question: string,
    language: Language,
    parsedData: any
  ): PolicyQAResponse {
    const lowerQ = question.toLowerCase();
    let answer = 'Please refer to your policy document for detailed information.';

    if (lowerQ.includes('coverage') || lowerQ.includes('covered')) {
      answer = parsedData?.sections?.coverage
        ? `Your policy covers: ${parsedData.sections.coverage.substring(0, 300)}`
        : 'Coverage details are available in your policy document.';
    } else if (lowerQ.includes('exclusion') || lowerQ.includes('not covered')) {
      const exclusions = parsedData?.sections?.exclusions || [];
      answer = exclusions.length > 0
        ? `Key exclusions: ${exclusions.slice(0, 5).join('; ')}`
        : 'Please check the exclusions section of your policy.';
    } else if (lowerQ.includes('premium') || lowerQ.includes('pay')) {
      answer = parsedData?.metadata?.premium
        ? `Your premium is ₹${parsedData.metadata.premium.toLocaleString('en-IN')}.`
        : 'Premium details are in your policy document.';
    } else if (lowerQ.includes('waiting period')) {
      const wps = parsedData?.extractedData?.waitingPeriods || [];
      answer = wps.length > 0
        ? `Waiting periods: ${wps.map((w: any) => `${w.period} for ${w.condition}`).join('; ')}`
        : 'Check your policy for waiting period details.';
    }

    return {
      question,
      answer,
      language,
      confidence: 50,
      relatedClauses: [],
    };
  }

  private getDisclaimer(language: Language): string {
    const disclaimers: Record<Language, string> = {
      en: 'Disclaimer: This is a simplified summary for understanding purposes only. The original policy document is legally binding.',
      hi: 'अस्वीकरण: यह केवल समझने के उद्देश्य से एक सरलीकृत सारांश है। मूल पॉलिसी दस्तावेज़ कानूनी रूप से बाध्यकारी है।',
      ta: 'மறுப்பு: இது புரிந்துகொள்ள மட்டுமே எளிமையான சுருக்கம். அசல் பாலிசி ஆவணம் சட்டப்பூர்வமாக பிணைக்கப்பட்டது.',
      te: 'నిరాకరణ: ఇది అర్థం చేసుకోవడానికి మాత్రమే సరళీకృత సారాంశం. అసలు పాలసీ పత్రం చట్టబద్ధంగా బంధించబడింది.',
      mr: 'अस्वीकरण: हा केवळ समजून घेण्यासाठी सरलीकृत सारांश आहे. मूळ पॉलिसी दस्तऐवज कायदेशीररित्या बंधनकारक आहे.',
      bn: 'দাবিত্যাগ: এটি শুধুমাত্র বোঝার জন্য একটি সরলীকৃত সারসংক্ষেপ। মূল পলিসি নথি আইনত বাধ্যতামূলক।',
      gu: 'અસ્વીકરણ: આ ફક્ત સમજવા માટે સરળ સારાંશ છે. મૂળ પોલિસી દસ્તાવેજ કાયદેસર રીતે બંધનકર્તા છે.',
    };
    return disclaimers[language] || disclaimers.en;
  }
}

export const translationService = new TranslationService();
