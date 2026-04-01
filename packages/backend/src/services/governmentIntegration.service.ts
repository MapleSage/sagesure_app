/**
 * Government Integration Service
 * Handles integration with government APIs: 1930 helpline and TRAI Chakshu
 * Implements retry logic with exponential backoff for reliability
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// Types for 1930 report
export interface Report1930Request {
  userId: string;
  scamType: string;
  scammerContact?: string;
  amountInvolved?: number;
  description: string;
  evidenceUrls?: string[];
  incidentDateTime: Date;
}

export interface Report1930Response {
  success: boolean;
  referenceNumber?: string;
  message: string;
  reportId: string;
}

// Types for TRAI Chakshu report
export interface ReportChakshuRequest {
  userId: string;
  phoneNumber: string;
  complaintType: 'TELEMARKETING' | 'FINANCIAL_FRAUD' | 'PHISHING' | 'OTHER';
  description: string;
  callDateTime?: Date;
}

export interface ReportChakshuResponse {
  success: boolean;
  referenceNumber?: string;
  message: string;
}

export class GovernmentIntegrationService {
  private readonly MAX_RETRIES = 3;
  private readonly BASE_DELAY_MS = 1000; // 1 second

  /**
   * Submit a scam report to 1930 helpline
   * Implements retry logic with exponential backoff (3 attempts)
   * 
   * @param request - Report details
   * @returns Report submission result with reference number
   */
  async report1930(request: Report1930Request): Promise<Report1930Response> {
    const startTime = Date.now();

    try {
      logger.info('Submitting report to 1930 helpline', {
        userId: request.userId,
        scamType: request.scamType,
      });

      // Create report in database first
      const report = await prisma.scamReport.create({
        data: {
          userId: request.userId,
          scamType: request.scamType,
          scammerContact: request.scammerContact,
          amountInvolved: request.amountInvolved,
          description: request.description,
          evidenceUrls: request.evidenceUrls || [],
          reportedTo1930: false,
          status: 'PENDING',
        },
      });

      // Attempt to submit to 1930 API with retry logic
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const referenceNumber = await this.submit1930Report(report.id, request);

          // Update report with reference number
          await prisma.scamReport.update({
            where: { id: report.id },
            data: {
              reportedTo1930: true,
              reportReference: referenceNumber,
              status: 'SUBMITTED',
            },
          });

          const duration = Date.now() - startTime;
          logger.info('1930 report submitted successfully', {
            userId: request.userId,
            reportId: report.id,
            referenceNumber,
            attempt,
            duration,
          });

          return {
            success: true,
            referenceNumber,
            message: `Report submitted successfully to 1930 helpline. Reference number: ${referenceNumber}`,
            reportId: report.id,
          };
        } catch (error) {
          lastError = error as Error;
          logger.warn(`1930 submission attempt ${attempt} failed`, {
            userId: request.userId,
            reportId: report.id,
            attempt,
            error: lastError.message,
          });

          // Wait before retry with exponential backoff
          if (attempt < this.MAX_RETRIES) {
            const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await this.sleep(delay);
          }
        }
      }

      // All retries failed - save report locally
      await prisma.scamReport.update({
        where: { id: report.id },
        data: {
          status: 'FAILED',
        },
      });

      logger.error('1930 submission failed after all retries', {
        userId: request.userId,
        reportId: report.id,
        error: lastError?.message,
      });

      return {
        success: false,
        message: 'Failed to submit report to 1930 helpline. Report saved locally. Please try manual submission or contact support.',
        reportId: report.id,
      };
    } catch (error) {
      logger.error('Error in report1930', { error, userId: request.userId });
      throw error;
    }
  }

  /**
   * Submit a telecom fraud complaint to TRAI Chakshu
   * Implements retry logic with exponential backoff (3 attempts)
   * 
   * @param request - Complaint details
   * @returns Complaint submission result with reference number
   */
  async reportChakshu(request: ReportChakshuRequest): Promise<ReportChakshuResponse> {
    const startTime = Date.now();

    try {
      logger.info('Submitting complaint to TRAI Chakshu', {
        userId: request.userId,
        phoneNumber: request.phoneNumber,
        complaintType: request.complaintType,
      });

      // Attempt to submit to Chakshu API with retry logic
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
        try {
          const referenceNumber = await this.submitChakshuComplaint(request);

          // Update telemarketer registry with report
          await prisma.telemarketerRegistry.upsert({
            where: { phoneNumber: request.phoneNumber },
            update: {
              reportCount: { increment: 1 },
              isScammer: true,
            },
            create: {
              phoneNumber: request.phoneNumber,
              isScammer: true,
              reportCount: 1,
              isVerified: false,
              isDnd: false,
            },
          });

          const duration = Date.now() - startTime;
          logger.info('Chakshu complaint submitted successfully', {
            userId: request.userId,
            phoneNumber: request.phoneNumber,
            referenceNumber,
            attempt,
            duration,
          });

          return {
            success: true,
            referenceNumber,
            message: `Complaint submitted successfully to TRAI Chakshu. Reference number: ${referenceNumber}`,
          };
        } catch (error) {
          lastError = error as Error;
          logger.warn(`Chakshu submission attempt ${attempt} failed`, {
            userId: request.userId,
            phoneNumber: request.phoneNumber,
            attempt,
            error: lastError.message,
          });

          // Wait before retry with exponential backoff
          if (attempt < this.MAX_RETRIES) {
            const delay = this.BASE_DELAY_MS * Math.pow(2, attempt - 1);
            await this.sleep(delay);
          }
        }
      }

      // All retries failed
      logger.error('Chakshu submission failed after all retries', {
        userId: request.userId,
        phoneNumber: request.phoneNumber,
        error: lastError?.message,
      });

      return {
        success: false,
        message: 'Failed to submit complaint to TRAI Chakshu. Please try again later or file manually at chakshu.trai.gov.in',
      };
    } catch (error) {
      logger.error('Error in reportChakshu', { error, userId: request.userId });
      throw error;
    }
  }

  /**
   * Submit report to 1930 API
   * This is a stub implementation - in production, this would call the actual 1930 API
   * 
   * @param reportId - Internal report ID
   * @param request - Report details
   * @returns Reference number from 1930 system
   */
  private async submit1930Report(reportId: string, request: Report1930Request): Promise<string> {
    // In production, this would make an HTTP request to the 1930 API
    // For now, we simulate the API call
    
    // Check if we should simulate a failure (for testing retry logic)
    if (process.env.SIMULATE_1930_FAILURE === 'true') {
      throw new Error('Simulated 1930 API failure');
    }

    // Simulate API call delay
    await this.sleep(100);

    // Generate a mock reference number
    const referenceNumber = `1930-${Date.now()}-${reportId.substring(0, 8)}`;

    // In production, the actual API call would look like:
    /*
    const response = await fetch(process.env.API_1930_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.API_1930_KEY}`,
      },
      body: JSON.stringify({
        scam_type: request.scamType,
        scammer_contact: request.scammerContact,
        amount_involved: request.amountInvolved,
        description: request.description,
        evidence_urls: request.evidenceUrls,
        incident_datetime: request.incidentDateTime.toISOString(),
        reporter_id: request.userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`1930 API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.reference_number;
    */

    return referenceNumber;
  }

  /**
   * Submit complaint to TRAI Chakshu API
   * This is a stub implementation - in production, this would call the actual Chakshu API
   * 
   * @param request - Complaint details
   * @returns Reference number from Chakshu system
   */
  private async submitChakshuComplaint(request: ReportChakshuRequest): Promise<string> {
    // In production, this would make an HTTP request to the TRAI Chakshu API
    // For now, we simulate the API call

    // Check if we should simulate a failure (for testing retry logic)
    if (process.env.SIMULATE_CHAKSHU_FAILURE === 'true') {
      throw new Error('Simulated Chakshu API failure');
    }

    // Simulate API call delay
    await this.sleep(100);

    // Generate a mock reference number
    const referenceNumber = `CHAKSHU-${Date.now()}-${request.phoneNumber.substring(0, 6)}`;

    // In production, the actual API call would look like:
    /*
    const response = await fetch(process.env.TRAI_CHAKSHU_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TRAI_CHAKSHU_KEY}`,
      },
      body: JSON.stringify({
        phone_number: request.phoneNumber,
        complaint_type: request.complaintType,
        description: request.description,
        call_datetime: request.callDateTime?.toISOString(),
        reporter_id: request.userId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chakshu API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.reference_number;
    */

    return referenceNumber;
  }

  /**
   * Sleep utility for retry delays
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const governmentIntegrationService = new GovernmentIntegrationService();
