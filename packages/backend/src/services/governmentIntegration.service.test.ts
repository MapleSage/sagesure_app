/**
 * Government Integration Service Unit Tests
 * Tests 1930 helpline and TRAI Chakshu integrations
 *
 * **Validates: Requirements 25.1, 25.2, 25.3, 25.4, 25.5, 25.6, 25.7**
 */

const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockUpsert = jest.fn();

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    scamReport: { create: mockCreate, update: mockUpdate },
    telemarketerRegistry: { upsert: mockUpsert },
    $disconnect: jest.fn(),
  })),
}));

jest.mock('../utils/logger', () => ({
  logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { GovernmentIntegrationService, Report1930Request, ReportChakshuRequest } from './governmentIntegration.service';

describe('GovernmentIntegrationService', () => {
  let service: GovernmentIntegrationService;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.SIMULATE_1930_FAILURE;
    delete process.env.SIMULATE_CHAKSHU_FAILURE;
    service = new GovernmentIntegrationService();
  });

  describe('report1930', () => {
    const sampleRequest: Report1930Request = {
      userId: 'user-123',
      scamType: 'DIGITAL_ARREST',
      scammerContact: '+919876543210',
      amountInvolved: 50000,
      description: 'Received a fake police video call demanding money transfer',
      evidenceUrls: ['https://evidence.example.com/video1.mp4'],
      incidentDateTime: new Date('2024-01-15T10:30:00Z'),
    };

    it('should submit report successfully and return reference number', async () => {
      mockCreate.mockResolvedValue({ id: 'report-abc' });
      mockUpdate.mockResolvedValue({});

      const result = await service.report1930(sampleRequest);

      expect(result.success).toBe(true);
      expect(result.referenceNumber).toBeDefined();
      expect(result.referenceNumber).toContain('1930-');
      expect(result.reportId).toBe('report-abc');
      expect(result.message).toContain('submitted successfully');
    });

    it('should store report in database before API submission', async () => {
      mockCreate.mockResolvedValue({ id: 'report-xyz' });
      mockUpdate.mockResolvedValue({});

      await service.report1930(sampleRequest);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          scamType: 'DIGITAL_ARREST',
          scammerContact: '+919876543210',
          amountInvolved: 50000,
          reportedTo1930: false,
          status: 'PENDING',
        }),
      });
    });

    it('should update report status to SUBMITTED on success', async () => {
      mockCreate.mockResolvedValue({ id: 'report-123' });
      mockUpdate.mockResolvedValue({});

      await service.report1930(sampleRequest);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'report-123' },
        data: expect.objectContaining({
          reportedTo1930: true,
          status: 'SUBMITTED',
        }),
      });
    });

    it('should retry on API failure with exponential backoff', async () => {
      process.env.SIMULATE_1930_FAILURE = 'true';

      mockCreate.mockResolvedValue({ id: 'report-fail' });
      mockUpdate.mockResolvedValue({});

      const startTime = Date.now();
      const result = await service.report1930(sampleRequest);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to submit');
      // At least 1s + 2s backoff between 3 retries
      expect(duration).toBeGreaterThanOrEqual(2500);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'report-fail' },
        data: { status: 'FAILED' },
      });
    }, 30000);

    it('should handle missing optional fields', async () => {
      const minimalRequest: Report1930Request = {
        userId: 'user-456',
        scamType: 'PHISHING',
        description: 'Received phishing SMS',
        incidentDateTime: new Date(),
      };

      mockCreate.mockResolvedValue({ id: 'report-min' });
      mockUpdate.mockResolvedValue({});

      const result = await service.report1930(minimalRequest);

      expect(result.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          evidenceUrls: [],
        }),
      });
    });
  });

  describe('reportChakshu', () => {
    const sampleRequest: ReportChakshuRequest = {
      userId: 'user-789',
      phoneNumber: '+919876543210',
      complaintType: 'FINANCIAL_FRAUD',
      description: 'Received fraudulent call claiming to be from bank',
      callDateTime: new Date('2024-01-15T14:00:00Z'),
    };

    it('should submit complaint successfully and return reference number', async () => {
      mockUpsert.mockResolvedValue({});

      const result = await service.reportChakshu(sampleRequest);

      expect(result.success).toBe(true);
      expect(result.referenceNumber).toBeDefined();
      expect(result.referenceNumber).toContain('CHAKSHU-');
      expect(result.message).toContain('submitted successfully');
    });

    it('should update telemarketer registry on successful report', async () => {
      mockUpsert.mockResolvedValue({});

      await service.reportChakshu(sampleRequest);

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { phoneNumber: '+919876543210' },
        update: { reportCount: { increment: 1 }, isScammer: true },
        create: expect.objectContaining({
          phoneNumber: '+919876543210',
          isScammer: true,
          reportCount: 1,
        }),
      });
    });

    it('should retry on Chakshu API failure', async () => {
      process.env.SIMULATE_CHAKSHU_FAILURE = 'true';

      const result = await service.reportChakshu(sampleRequest);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to submit');
    }, 30000);

    it('should handle all complaint types', async () => {
      mockUpsert.mockResolvedValue({});

      const types: Array<'TELEMARKETING' | 'FINANCIAL_FRAUD' | 'PHISHING' | 'OTHER'> = [
        'TELEMARKETING', 'FINANCIAL_FRAUD', 'PHISHING', 'OTHER',
      ];

      for (const complaintType of types) {
        const result = await service.reportChakshu({ ...sampleRequest, complaintType });
        expect(result.success).toBe(true);
      }
    });
  });
});
