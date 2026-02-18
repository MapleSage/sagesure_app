import * as policyPulseService from './policyPulse.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    policy: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock pdf-parse
jest.mock('pdf-parse', () => {
  return jest.fn((buffer: Buffer) => {
    const content = buffer.toString();
    return Promise.resolve({
      numpages: 10,
      text: content,
    });
  });
});

const prisma = new PrismaClient();

describe('PolicyPulse Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseMetadata', () => {
    it('should extract insurer name from text', () => {
      const text = `
        Policy Document
        Issued by: HDFC ERGO Health Insurance
        Policy Number: POL123456
      `;

      const metadata = policyPulseService.parseMetadata(text);
      expect(metadata.insurerName).toBe('HDFC ERGO Health Insurance');
    });

    it('should extract policy number from text', () => {
      const text = `
        Policy No: ABC/2024/12345
        Insurer: Star Health Insurance
      `;

      const metadata = policyPulseService.parseMetadata(text);
      expect(metadata.policyNumber).toBe('ABC/2024/12345');
    });

    it('should extract dates from text', () => {
      const text = `
        Issue Date: 01/01/2024
        Expiry Date: 31/12/2024
      `;

      const metadata = policyPulseService.parseMetadata(text);
      expect(metadata.issueDate).toBeInstanceOf(Date);
      expect(metadata.expiryDate).toBeInstanceOf(Date);
      expect(metadata.issueDate?.getFullYear()).toBe(2024);
      expect(metadata.expiryDate?.getFullYear()).toBe(2024);
    });

    it('should extract sum assured from text', () => {
      const text = `
        Sum Assured: Rs. 5,00,000
        Premium: Rs. 12,000
      `;

      const metadata = policyPulseService.parseMetadata(text);
      expect(metadata.sumAssured).toBe(500000);
      expect(metadata.premium).toBe(12000);
    });

    it('should handle missing fields gracefully', () => {
      const text = 'This is a policy document with minimal information';

      const metadata = policyPulseService.parseMetadata(text);
      expect(metadata.insurerName).toBe('');
      expect(metadata.policyNumber).toBe('');
      expect(metadata.sumAssured).toBeNull();
    });
  });

  describe('parseSections', () => {
    it('should extract coverage section', () => {
      const text = `
        Coverage: This policy covers hospitalization expenses, pre and post hospitalization, 
        ambulance charges, and day care procedures.
        
        Exclusions: Pre-existing conditions, cosmetic surgery
      `;

      const sections = policyPulseService.parseSections(text);
      expect(sections.coverage).toContain('hospitalization expenses');
    });

    it('should extract exclusions as array', () => {
      const text = `
        Exclusions:
        1. Pre-existing conditions for first 2 years
        2. Cosmetic surgery and treatments
        3. Dental treatments unless due to accident
        4. Maternity expenses
      `;

      const sections = policyPulseService.parseSections(text);
      expect(sections.exclusions.length).toBeGreaterThan(0);
      expect(sections.exclusions.some((e) => e.includes('Pre-existing'))).toBe(true);
    });

    it('should handle missing sections', () => {
      const text = 'Minimal policy document';

      const sections = policyPulseService.parseSections(text);
      expect(sections.coverage).toBe('');
      expect(sections.exclusions).toEqual([]);
    });
  });

  describe('extractAdditionalData', () => {
    it('should extract waiting periods', () => {
      const text = `
        Waiting Period: 30 days for general illnesses
        Waiting Period: 2 years for pre-existing conditions
        Waiting Period: 4 years for specific diseases
      `;

      const data = policyPulseService.extractAdditionalData(text);
      expect(data.waitingPeriods.length).toBeGreaterThan(0);
      expect(data.waitingPeriods.some((wp) => wp.period.includes('30 days'))).toBe(true);
    });

    it('should extract co-payment percentage', () => {
      const text = 'Co-payment: 20% of claim amount';

      const data = policyPulseService.extractAdditionalData(text);
      expect(data.coPayment).toBe(20);
    });

    it('should extract room rent limit', () => {
      const text = 'Room Rent: Rs. 5,000 per day';

      const data = policyPulseService.extractAdditionalData(text);
      expect(data.roomRentLimit).toBe(5000);
    });

    it('should extract sub-limits', () => {
      const text = `
        Cataract surgery limited to Rs. 50,000
        Knee replacement capped at Rs. 2,00,000
      `;

      const data = policyPulseService.extractAdditionalData(text);
      expect(data.subLimits.length).toBeGreaterThan(0);
    });
  });

  describe('validatePolicyData', () => {
    it('should identify missing critical fields', () => {
      const parsedPolicy: policyPulseService.ParsedPolicy = {
        policyId: 'test-id',
        metadata: {
          insurerName: '',
          policyNumber: '',
          issueDate: null,
          expiryDate: null,
          sumAssured: null,
          premium: null,
        },
        sections: {
          coverage: '',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: null,
          roomRentLimit: null,
        },
      };

      const validation = policyPulseService.validatePolicyData(parsedPolicy);
      expect(validation.isValid).toBe(false);
      expect(validation.missingCriticalFields).toContain('insurerName');
      expect(validation.missingCriticalFields).toContain('policyNumber');
      expect(validation.missingCriticalFields).toContain('sumAssured');
    });

    it('should detect unusually low sum assured', () => {
      const parsedPolicy: policyPulseService.ParsedPolicy = {
        policyId: 'test-id',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'POL123',
          issueDate: null,
          expiryDate: null,
          sumAssured: 5000, // Unusually low
          premium: 1000,
        },
        sections: {
          coverage: '',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: null,
          roomRentLimit: null,
        },
      };

      const validation = policyPulseService.validatePolicyData(parsedPolicy);
      expect(validation.anomalies.some((a) => a.includes('unusually low'))).toBe(true);
    });

    it('should detect high premium to sum assured ratio', () => {
      const parsedPolicy: policyPulseService.ParsedPolicy = {
        policyId: 'test-id',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'POL123',
          issueDate: null,
          expiryDate: null,
          sumAssured: 100000,
          premium: 30000, // 30% ratio
        },
        sections: {
          coverage: '',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: null,
          roomRentLimit: null,
        },
      };

      const validation = policyPulseService.validatePolicyData(parsedPolicy);
      expect(validation.anomalies.some((a) => a.includes('very high relative'))).toBe(true);
    });

    it('should detect excessive exclusions', () => {
      const parsedPolicy: policyPulseService.ParsedPolicy = {
        policyId: 'test-id',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'POL123',
          issueDate: null,
          expiryDate: null,
          sumAssured: 500000,
          premium: 10000,
        },
        sections: {
          coverage: '',
          exclusions: Array(25).fill('Exclusion item'), // 25 exclusions
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: null,
          roomRentLimit: null,
        },
      };

      const validation = policyPulseService.validatePolicyData(parsedPolicy);
      expect(validation.anomalies.some((a) => a.includes('Excessive number of exclusions'))).toBe(true);
    });

    it('should detect high co-payment', () => {
      const parsedPolicy: policyPulseService.ParsedPolicy = {
        policyId: 'test-id',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'POL123',
          issueDate: null,
          expiryDate: null,
          sumAssured: 500000,
          premium: 10000,
        },
        sections: {
          coverage: '',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: 60, // 60% co-payment
          roomRentLimit: null,
        },
      };

      const validation = policyPulseService.validatePolicyData(parsedPolicy);
      expect(validation.anomalies.some((a) => a.includes('Co-payment is very high'))).toBe(true);
    });

    it('should validate dates correctly', () => {
      const issueDate = new Date('2024-01-01');
      const expiryDate = new Date('2023-12-31'); // Before issue date

      const parsedPolicy: policyPulseService.ParsedPolicy = {
        policyId: 'test-id',
        metadata: {
          insurerName: 'Test Insurance',
          policyNumber: 'POL123',
          issueDate,
          expiryDate,
          sumAssured: 500000,
          premium: 10000,
        },
        sections: {
          coverage: '',
          exclusions: [],
          terms: '',
          conditions: '',
        },
        extractedData: {
          waitingPeriods: [],
          subLimits: [],
          coPayment: null,
          roomRentLimit: null,
        },
      };

      const validation = policyPulseService.validatePolicyData(parsedPolicy);
      expect(validation.anomalies.some((a) => a.includes('before or same as issue date'))).toBe(true);
    });
  });

  describe('uploadPolicy', () => {
    it('should successfully parse and store a valid policy', async () => {
      const mockPolicy = {
        policyId: 'test-policy-id',
        userId: 'test-user-id',
        insurerName: 'HDFC ERGO Health Insurance',
        policyNumber: 'POL123456',
        policyType: 'HEALTH',
        issueDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        sumAssured: 500000,
        premium: 12000,
        originalPdfUrl: 'test.pdf',
        parsedData: {},
      };

      (prisma.policy.create as jest.Mock).mockResolvedValue(mockPolicy);

      const pdfContent = `
        Policy Document
        Issued by: HDFC ERGO Health Insurance
        Policy Number: POL123456
        Issue Date: 01/01/2024
        Expiry Date: 31/12/2024
        Sum Assured: Rs. 5,00,000
        Premium: Rs. 12,000
        
        Coverage: Hospitalization expenses
        Exclusions: Pre-existing conditions
      `;

      const result = await policyPulseService.uploadPolicy(
        'test-user-id',
        Buffer.from(pdfContent),
        'test.pdf'
      );

      expect(result.status).toBe('success');
      expect(result.policyId).toBe('test-policy-id');
      expect(result.parsedPolicy).toBeDefined();
      expect(prisma.policy.create).toHaveBeenCalled();
    });

    it('should handle parsing errors gracefully', async () => {
      const result = await policyPulseService.uploadPolicy(
        'test-user-id',
        Buffer.from('Invalid PDF content'),
        'test.pdf'
      );

      // Should still attempt to parse even with minimal content
      expect(result.status).toBe('partial');
      expect(result.missingFields).toBeDefined();
    });
  });

  describe('getParsedPolicy', () => {
    it('should retrieve and return parsed policy', async () => {
      const mockPolicy = {
        policyId: 'test-policy-id',
        userId: 'test-user-id',
        insurerName: 'HDFC ERGO',
        policyNumber: 'POL123',
        issueDate: new Date('2024-01-01'),
        expiryDate: new Date('2024-12-31'),
        sumAssured: 500000,
        premium: 12000,
        parsedData: {
          metadata: {
            insurerName: 'HDFC ERGO',
            policyNumber: 'POL123',
            issueDate: new Date('2024-01-01'),
            expiryDate: new Date('2024-12-31'),
            sumAssured: 500000,
            premium: 12000,
          },
          sections: {
            coverage: 'Test coverage',
            exclusions: ['Exclusion 1'],
            terms: 'Test terms',
            conditions: 'Test conditions',
          },
          extractedData: {
            waitingPeriods: [],
            subLimits: [],
            coPayment: null,
            roomRentLimit: null,
          },
        },
      };

      (prisma.policy.findFirst as jest.Mock).mockResolvedValue(mockPolicy);

      const result = await policyPulseService.getParsedPolicy('test-policy-id', 'test-user-id');

      expect(result).toBeDefined();
      expect(result?.policyId).toBe('test-policy-id');
      expect(result?.metadata.insurerName).toBe('HDFC ERGO');
    });

    it('should return null for non-existent policy', async () => {
      (prisma.policy.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await policyPulseService.getParsedPolicy('non-existent-id', 'test-user-id');

      expect(result).toBeNull();
    });
  });
});
