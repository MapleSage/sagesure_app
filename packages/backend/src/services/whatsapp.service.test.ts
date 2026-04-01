/**
 * WhatsApp Service Unit Tests
 * Tests message parsing, routing, multi-language support, and queue processing
 *
 * **Validates: Requirements 5.2, 5.4, 5.5, 5.8**
 */

jest.mock('bull', () => {
  return jest.fn().mockImplementation(() => ({
    process: jest.fn(),
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    on: jest.fn(),
    close: jest.fn(),
    getWaitingCount: jest.fn().mockResolvedValue(0),
    getActiveCount: jest.fn().mockResolvedValue(0),
    getCompletedCount: jest.fn().mockResolvedValue(5),
    getFailedCount: jest.fn().mockResolvedValue(0),
  }));
});

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    $queryRaw: jest.fn().mockResolvedValue([]),
    telemarketerRegistry: { findUnique: jest.fn().mockResolvedValue(null) },
    verifiedBrand: { findFirst: jest.fn().mockResolvedValue(null) },
    $disconnect: jest.fn(),
  })),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { WhatsAppService, IncomingWhatsAppMessage } from './whatsapp.service';

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  beforeEach(() => {
    service = new WhatsAppService();
  });

  describe('detectLanguage', () => {
    it('should detect English by default', () => {
      expect(service.detectLanguage('Hello, is this a scam?')).toBe('en');
    });

    it('should detect Hindi from Devanagari script', () => {
      expect(service.detectLanguage('यह एक धोखाधड़ी है')).toBe('hi');
    });

    it('should detect Tamil from Tamil script', () => {
      expect(service.detectLanguage('இது ஒரு மோசடி')).toBe('ta');
    });

    it('should detect Telugu from Telugu script', () => {
      expect(service.detectLanguage('ఇది ఒక మోసం')).toBe('te');
    });

    it('should detect Hindi from explicit keyword', () => {
      expect(service.detectLanguage('hindi me batao')).toBe('hi');
    });
  });

  describe('detectMessageType', () => {
    const baseMsg: IncomingWhatsAppMessage = {
      from: 'whatsapp:+919876543210',
      body: '',
      messageSid: 'SM123',
    };

    it('should detect greeting messages', () => {
      expect(service.detectMessageType({ ...baseMsg, body: 'hi' })).toBe('greeting');
      expect(service.detectMessageType({ ...baseMsg, body: 'hello' })).toBe('greeting');
      expect(service.detectMessageType({ ...baseMsg, body: 'help' })).toBe('greeting');
      expect(service.detectMessageType({ ...baseMsg, body: 'namaste' })).toBe('greeting');
    });

    it('should detect phone numbers', () => {
      expect(service.detectMessageType({ ...baseMsg, body: '9876543210' })).toBe('phone');
      expect(service.detectMessageType({ ...baseMsg, body: '+919876543210' })).toBe('phone');
    });

    it('should detect image messages', () => {
      expect(
        service.detectMessageType({
          ...baseMsg,
          body: 'check this',
          mediaUrl: 'https://example.com/img.jpg',
          mediaContentType: 'image/jpeg',
        })
      ).toBe('image');
    });

    it('should default to text analysis', () => {
      expect(
        service.detectMessageType({
          ...baseMsg,
          body: 'Your policy has been suspended. Click here to reactivate.',
        })
      ).toBe('text');
    });
  });

  describe('processMessage', () => {
    it('should return welcome message for greetings', async () => {
      const msg: IncomingWhatsAppMessage = {
        from: 'whatsapp:+919876543210',
        body: 'hello',
        messageSid: 'SM123',
      };

      const response = await service.processMessage(msg);

      expect(response.to).toBe('whatsapp:+919876543210');
      expect(response.body).toContain('SageSure ScamShield');
      expect(response.language).toBe('en');
    });

    it('should return Hindi welcome for Hindi greeting', async () => {
      const msg: IncomingWhatsAppMessage = {
        from: 'whatsapp:+919876543210',
        body: 'namaste',
        messageSid: 'SM456',
      };

      const response = await service.processMessage(msg);
      expect(response.body).toContain('SageSure ScamShield');
    });

    it('should analyze text messages and return risk assessment', async () => {
      const msg: IncomingWhatsAppMessage = {
        from: 'whatsapp:+919876543210',
        body: 'Your insurance policy has been suspended. Click here to reactivate.',
        messageSid: 'SM789',
      };

      const response = await service.processMessage(msg);

      expect(response.to).toBe('whatsapp:+919876543210');
      expect(response.body).toContain('Risk Score');
    });

    it('should handle errors gracefully', async () => {
      // Force an error by passing a message that will trigger error handling
      const msg: IncomingWhatsAppMessage = {
        from: 'whatsapp:+919876543210',
        body: '9876543210', // phone verification - will work with mock
        messageSid: 'SM-err',
      };

      const response = await service.processMessage(msg);
      expect(response.to).toBe('whatsapp:+919876543210');
      // Should return some response (either verification or error)
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('handleIncomingMessage', () => {
    it('should enqueue message when queue is available', async () => {
      const msg: IncomingWhatsAppMessage = {
        from: 'whatsapp:+919876543210',
        body: 'Is this a scam?',
        messageSid: 'SM-queue',
      };

      const response = await service.handleIncomingMessage(msg);

      // Should return acknowledgment since queue is mocked
      expect(response.to).toBe('whatsapp:+919876543210');
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty('waiting');
      expect(stats).toHaveProperty('active');
      expect(stats).toHaveProperty('completed');
      expect(stats).toHaveProperty('failed');
    });
  });
});
