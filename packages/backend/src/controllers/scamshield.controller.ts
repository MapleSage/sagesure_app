/**
 * ScamShield Controller
 * Handles HTTP requests for scam detection and analysis
 */

import { Request, Response, NextFunction } from 'express';
import { scamShieldService } from '../services/scamshield.service';
import { familyService } from '../services/family.service';
import * as deepfakeService from '../services/deepfake.service';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/auditLogger';

export class ScamShieldController {
  /**
   * POST /api/v1/scamshield/analyze-message
   * Analyze a message for scam patterns
   */
  async analyzeMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { message } = req.body;
      const userId = req.user?.userId || 'anonymous';

      // Validate input
      if (!message || typeof message !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Message is required and must be a string',
        });
        return;
      }

      if (message.length > 10000) {
        res.status(400).json({
          success: false,
          error: 'Message is too long (max 10,000 characters)',
        });
        return;
      }

      // Analyze message
      const analysis = await scamShieldService.analyzeMessage(message, userId);

      // Trigger family alerts if high-risk scam detected (risk score > 70) and user is authenticated
      if (analysis.riskScore > 70 && userId !== 'anonymous') {
        try {
          const alertMessage = `A high-risk scam message was detected:\n\n"${message.substring(0, 200)}${message.length > 200 ? '...' : ''}"\n\nMatched patterns: ${analysis.matchedPatterns.join(', ')}\n\nWarnings: ${analysis.warnings.join(' ')}`;
          
          await familyService.sendFamilyAlerts(userId, alertMessage, analysis.riskScore);
          
          logger.info('Family alerts triggered for high-risk scam', {
            userId,
            riskScore: analysis.riskScore,
          });
        } catch (alertError) {
          // Don't fail the request if family alerts fail
          logger.error('Error sending family alerts', { error: alertError, userId });
        }
      }

      // Audit log
      await auditLog({
        userId,
        actionType: 'SCAM_ANALYSIS',
        resourceType: 'MESSAGE',
        resourceId: null,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        outcome: 'SUCCESS',
        details: {
          riskScore: analysis.riskScore,
          isScam: analysis.isScam,
          matchedPatterns: analysis.matchedPatterns.length,
        },
      });

      res.status(200).json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      logger.error('Error in analyzeMessage controller', { error });
      next(error);
    }
  }


  /**
   * POST /api/v1/scamshield/verify-phone
   * Verify a phone number against telemarketer registry
   */
  async verifyPhoneNumber(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { phoneNumber } = req.body;
      const userId = req.user?.userId || 'anonymous';

      // Validate input
      if (!phoneNumber || typeof phoneNumber !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Phone number is required and must be a string',
        });
        return;
      }

      // Verify phone number
      const verification = await scamShieldService.verifyPhoneNumber(phoneNumber, userId);

      // Audit log
      await auditLog({
        userId,
        actionType: 'PHONE_VERIFICATION',
        resourceType: 'PHONE_NUMBER',
        resourceId: phoneNumber,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        outcome: 'SUCCESS',
        details: {
          isVerified: verification.isVerified,
          isScammer: verification.isKnownScammer,
          isDND: verification.isDND,
        },
      });

      res.status(200).json({
        success: true,
        data: verification,
      });
    } catch (error) {
      logger.error('Error in verifyPhoneNumber controller', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/scamshield/analyze-video
   * Analyze a video for deepfake indicators
   */
  async analyzeVideo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No video file uploaded',
        });
        return;
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (req.file.size > maxSize) {
        res.status(400).json({
          success: false,
          error: 'File size exceeds 100MB limit',
        });
        return;
      }

      // Validate file type (video formats)
      const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          success: false,
          error: 'Invalid file type. Allowed formats: MP4, MPEG, MOV, AVI, WEBM',
        });
        return;
      }

      const startTime = Date.now();

      // Analyze video for deepfake indicators
      const analysis = await deepfakeService.analyzeVideo(req.file.buffer, userId);

      // Store incident in database
      const { scammerContact, amountInvolved } = req.body;
      const incidentId = await deepfakeService.storeDigitalArrestIncident(
        userId,
        req.file.originalname, // In production, this would be Azure Blob Storage URL
        analysis,
        scammerContact,
        amountInvolved ? parseFloat(amountInvolved) : undefined
      );

      // Trigger family alerts if deepfake detected
      if (analysis.isDeepfake && analysis.confidence > 60) {
        try {
          const alertMessage = `⚠️ URGENT: Potential digital arrest scam detected!\n\nA video call recording was analyzed and shows signs of deepfake manipulation (${analysis.confidence}% confidence).\n\nAnomalies detected:\n${analysis.anomalies.facialInconsistencies.join('\n')}\n${!analysis.anomalies.audioVisualSync ? '- Poor audio-visual synchronization' : ''}\n${analysis.anomalies.backgroundAnomalies.join('\n')}\n\nPlease contact your family member immediately to verify their safety.`;
          
          await familyService.sendFamilyAlerts(userId, alertMessage, 100); // Max priority
          
          logger.info('Family alerts triggered for deepfake detection', {
            userId,
            incidentId,
            confidence: analysis.confidence,
          });
        } catch (alertError) {
          logger.error('Error sending family alerts for deepfake', { error: alertError, userId });
        }
      }

      const duration = Date.now() - startTime;

      // Audit log
      await auditLog({
        userId,
        actionType: 'DEEPFAKE_ANALYSIS',
        resourceType: 'VIDEO',
        resourceId: incidentId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        outcome: 'SUCCESS',
        details: {
          isDeepfake: analysis.isDeepfake,
          confidence: analysis.confidence,
          fileSize: req.file.size,
          duration,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          incidentId,
          analysis,
        },
      });
    } catch (error) {
      logger.error('Error in analyzeVideo controller', { error });
      next(error);
    }
  }

}

export const scamShieldController = new ScamShieldController();
