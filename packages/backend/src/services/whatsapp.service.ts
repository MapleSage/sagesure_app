/**
 * WhatsApp Bot Service
 * Handles incoming WhatsApp messages via Twilio, routes to analysis,
 * and returns multi-language responses.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8
 */

import Bull from 'bull';
import { scamShieldService } from './scamshield.service';
import { logger } from '../utils/logger';

export type SupportedLanguage = 'en' | 'hi' | 'ta' | 'te';

export interface IncomingWhatsAppMessage {
  from: string;
  body: string;
  mediaUrl?: string;
  mediaContentType?: string;
  profileName?: string;
  messageSid: string;
}

export interface WhatsAppResponse {
  to: string;
  body: string;
  language: SupportedLanguage;
}

// Language detection keywords
const LANGUAGE_KEYWORDS: Record<SupportedLanguage, string[]> = {
  hi: ['kya', 'hai', 'mera', 'mujhe', 'yeh', 'nahi', 'haan', 'kaise', 'hindi'],
  ta: ['enna', 'irukku', 'naan', 'oru', 'tamil'],
  te: ['emi', 'undi', 'nenu', 'oka', 'telugu'],
  en: [],
};

// Multi-language response templates
const RESPONSES: Record<string, Record<SupportedLanguage, string>> = {
  welcome: {
    en: '🛡️ Welcome to SageSure ScamShield! Send me a suspicious message, phone number, or image to analyze.',
    hi: '🛡️ SageSure ScamShield में आपका स्वागत है! विश्लेषण के लिए कोई संदिग्ध संदेश, फ़ोन नंबर या छवि भेजें।',
    ta: '🛡️ SageSure ScamShield-க்கு வரவேற்கிறோம்! சந்தேகமான செய்தி, தொலைபேசி எண் அல்லது படத்தை அனுப்புங்கள்.',
    te: '🛡️ SageSure ScamShield కి స్వాగతం! అనుమానాస్పద సందేశం, ఫోన్ నంబర్ లేదా చిత్రాన్ని పంపండి.',
  },
  highRisk: {
    en: '🚨 HIGH RISK DETECTED!\nRisk Score: {score}/100\n\n⚠️ Warnings:\n{warnings}\n\n📋 Recommendations:\n{recommendations}\n\nReport to 1930 helpline? Reply YES.',
    hi: '🚨 उच्च जोखिम का पता चला!\nजोखिम स्कोर: {score}/100\n\n⚠️ चेतावनी:\n{warnings}\n\n📋 सुझाव:\n{recommendations}\n\n1930 हेल्पलाइन पर रिपोर्ट करें? YES लिखें।',
    ta: '🚨 அதிக ஆபத்து கண்டறியப்பட்டது!\nஆபத்து மதிப்பெண்: {score}/100\n\n⚠️ எச்சரிக்கைகள்:\n{warnings}\n\n📋 பரிந்துரைகள்:\n{recommendations}\n\n1930 ஹெல்ப்லைனில் புகார் செய்யவா? YES என பதிலளிக்கவும்.',
    te: '🚨 అధిక ప్రమాదం గుర్తించబడింది!\nప్రమాద స్కోర్: {score}/100\n\n⚠️ హెచ్చరికలు:\n{warnings}\n\n📋 సిఫార్సులు:\n{recommendations}\n\n1930 హెల్ప్‌లైన్‌కు నివేదించాలా? YES అని రిప్లై చేయండి.',
  },
  lowRisk: {
    en: '✅ Analysis Complete\nRisk Score: {score}/100\n\nThis message appears to be low risk.\n\n💡 {recommendations}',
    hi: '✅ विश्लेषण पूर्ण\nजोखिम स्कोर: {score}/100\n\nयह संदेश कम जोखिम वाला प्रतीत होता है।\n\n💡 {recommendations}',
    ta: '✅ பகுப்பாய்வு முடிந்தது\nஆபத்து மதிப்பெண்: {score}/100\n\nஇந்த செய்தி குறைந்த ஆபத்து.\n\n💡 {recommendations}',
    te: '✅ విశ్లేషణ పూర్తయింది\nప్రమాద స్కోర్: {score}/100\n\nఈ సందేశం తక్కువ ప్రమాదం.\n\n💡 {recommendations}',
  },
  error: {
    en: '❌ Sorry, we encountered an error processing your message. Please try again.',
    hi: '❌ क्षमा करें, आपके संदेश को प्रोसेस करने में त्रुटि हुई। कृपया पुनः प्रयास करें।',
    ta: '❌ மன்னிக்கவும், உங்கள் செய்தியை செயலாக்குவதில் பிழை. மீண்டும் முயற்சிக்கவும்.',
    te: '❌ క్షమించండి, మీ సందేశాన్ని ప్రాసెస్ చేయడంలో లోపం. దయచేసి మళ్ళీ ప్రయత్నించండి.',
  },
  acknowledged: {
    en: '⏳ Analyzing your message... Please wait.',
    hi: '⏳ आपके संदेश का विश्लेषण हो रहा है... कृपया प्रतीक्षा करें।',
    ta: '⏳ உங்கள் செய்தியை பகுப்பாய்வு செய்கிறோம்... காத்திருக்கவும்.',
    te: '⏳ మీ సందేశాన్ని విశ్లేషిస్తోంది... దయచేసి వేచి ఉండండి.',
  },
};

export class WhatsAppService {
  private messageQueue: Bull.Queue | null = null;

  constructor() {
    this.initQueue();
  }

  private initQueue(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.messageQueue = new Bull('whatsapp-messages', redisUrl, {
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: 100,
          removeOnFail: 50,
        },
      });

      this.messageQueue.process(async (job) => {
        return this.processMessage(job.data);
      });

      this.messageQueue.on('failed', (job, err) => {
        logger.error('WhatsApp message processing failed', {
          jobId: job.id,
          from: job.data.from,
          error: err.message,
        });
      });

      logger.info('WhatsApp message queue initialized');
    } catch (error) {
      logger.warn('Failed to initialize Bull queue, falling back to direct processing', { error });
      this.messageQueue = null;
    }
  }

  /**
   * Detect language from message text
   */
  detectLanguage(text: string): SupportedLanguage {
    const lower = text.toLowerCase();

    // Check explicit language requests
    if (lower.includes('hindi') || lower.includes('हिंदी')) return 'hi';
    if (lower.includes('tamil') || lower.includes('தமிழ்')) return 'ta';
    if (lower.includes('telugu') || lower.includes('తెలుగు')) return 'te';

    // Check for language-specific keywords
    for (const [lang, keywords] of Object.entries(LANGUAGE_KEYWORDS)) {
      if (lang === 'en') continue;
      const matchCount = keywords.filter((kw) => lower.includes(kw)).length;
      if (matchCount >= 2) return lang as SupportedLanguage;
    }

    // Check for non-ASCII characters (likely Indian language)
    const devanagariRegex = /[\u0900-\u097F]/;
    const tamilRegex = /[\u0B80-\u0BFF]/;
    const teluguRegex = /[\u0C00-\u0C7F]/;

    if (devanagariRegex.test(text)) return 'hi';
    if (tamilRegex.test(text)) return 'ta';
    if (teluguRegex.test(text)) return 'te';

    return 'en';
  }

  /**
   * Determine message type: text analysis, phone verification, or image OCR
   */
  detectMessageType(message: IncomingWhatsAppMessage): 'text' | 'phone' | 'image' | 'greeting' {
    const body = message.body.trim().toLowerCase();

    // Check for greetings
    if (['hi', 'hello', 'hey', 'start', 'help', 'namaste'].includes(body)) {
      return 'greeting';
    }

    // Check for phone number
    const phoneRegex = /^(\+?91)?[-\s]?[6-9]\d{9}$/;
    if (phoneRegex.test(message.body.replace(/[\s-]/g, ''))) {
      return 'phone';
    }

    // Check for image
    if (message.mediaUrl && message.mediaContentType?.startsWith('image/')) {
      return 'image';
    }

    return 'text';
  }

  /**
   * Handle incoming WhatsApp message - enqueue or process directly
   */
  async handleIncomingMessage(message: IncomingWhatsAppMessage): Promise<WhatsAppResponse> {
    logger.info('Incoming WhatsApp message', {
      from: message.from,
      type: this.detectMessageType(message),
      hasMedia: !!message.mediaUrl,
    });

    if (this.messageQueue) {
      try {
        await this.messageQueue.add(message, { priority: 1 });
        const language = this.detectLanguage(message.body);
        return {
          to: message.from,
          body: RESPONSES.acknowledged[language],
          language,
        };
      } catch (error) {
        logger.warn('Queue add failed, processing directly', { error });
      }
    }

    // Direct processing fallback
    return this.processMessage(message);
  }

  /**
   * Process a WhatsApp message and return analysis response
   */
  async processMessage(message: IncomingWhatsAppMessage): Promise<WhatsAppResponse> {
    const language = this.detectLanguage(message.body);
    const messageType = this.detectMessageType(message);

    try {
      if (messageType === 'greeting') {
        return {
          to: message.from,
          body: RESPONSES.welcome[language],
          language,
        };
      }

      if (messageType === 'phone') {
        const verification = await scamShieldService.verifyPhoneNumber(
          message.body.trim(),
          message.from
        );
        const warningText = verification.warnings.join('\n');
        return {
          to: message.from,
          body: `📱 Phone Verification Result:\n${warningText}`,
          language,
        };
      }

      // Default: text analysis
      const analysis = await scamShieldService.analyzeMessage(message.body, message.from);

      const template = analysis.riskScore > 70 ? RESPONSES.highRisk : RESPONSES.lowRisk;
      const body = template[language]
        .replace('{score}', String(analysis.riskScore))
        .replace('{warnings}', analysis.warnings.join('\n'))
        .replace('{recommendations}', analysis.recommendations.join('\n'));

      return { to: message.from, body, language };
    } catch (error) {
      logger.error('Error processing WhatsApp message', { error, from: message.from });
      return {
        to: message.from,
        body: RESPONSES.error[language],
        language,
      };
    }
  }

  /**
   * Get queue stats for monitoring
   */
  async getQueueStats(): Promise<{ waiting: number; active: number; completed: number; failed: number } | null> {
    if (!this.messageQueue) return null;
    const [waiting, active, completed, failed] = await Promise.all([
      this.messageQueue.getWaitingCount(),
      this.messageQueue.getActiveCount(),
      this.messageQueue.getCompletedCount(),
      this.messageQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
  }

  async close(): Promise<void> {
    if (this.messageQueue) {
      await this.messageQueue.close();
    }
  }
}

export const whatsappService = new WhatsAppService();
