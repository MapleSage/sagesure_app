import { Request, Response, NextFunction } from 'express';
import * as policyPulseService from '../services/policyPulse.service';
import { logger } from '../utils/logger';
import { logAudit } from '../utils/auditLogger';

/**
 * Upload and parse policy PDF
 * POST /api/v1/policy-pulse/upload-policy
 */
export async function uploadPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Check if file was uploaded
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (req.file.size > maxSize) {
      res.status(400).json({ error: 'File size exceeds 50MB limit' });
      return;
    }

    // Validate file type
    if (req.file.mimetype !== 'application/pdf') {
      res.status(400).json({ error: 'Only PDF files are allowed' });
      return;
    }

    const startTime = Date.now();

    // Upload and parse policy
    const result = await policyPulseService.uploadPolicy(
      userId,
      req.file.buffer,
      req.file.originalname
    );

    const duration = Date.now() - startTime;

    // Log audit trail
    await logAudit({
      userId,
      actionType: 'POLICY_UPLOAD',
      resourceType: 'policy',
      resourceId: result.policyId,
      outcome: result.status === 'failed' ? 'FAILURE' : 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        filename: req.file.originalname,
        fileSize: req.file.size,
        status: result.status,
        duration,
      },
    });

    logger.info('Policy upload request completed', {
      userId,
      policyId: result.policyId,
      status: result.status,
      duration,
    });

    if (result.status === 'failed') {
      res.status(400).json({
        error: 'Policy parsing failed',
        message: result.message,
      });
      return;
    }

    res.status(200).json({
      message: result.message,
      policyId: result.policyId,
      status: result.status,
      parsedPolicy: result.parsedPolicy,
      missingFields: result.missingFields,
    });
  } catch (error) {
    logger.error('Policy upload error', { error, userId: req.user?.userId });
    next(error);
  }
}

/**
 * Get parsed policy by ID
 * GET /api/v1/policy-pulse/policy/:policyId
 */
export async function getPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { policyId } = req.params;

    if (!policyId) {
      res.status(400).json({ error: 'Policy ID is required' });
      return;
    }

    const policy = await policyPulseService.getParsedPolicy(policyId, userId);

    if (!policy) {
      res.status(404).json({ error: 'Policy not found' });
      return;
    }

    // Log audit trail
    await logAudit({
      userId,
      actionType: 'POLICY_VIEW',
      resourceType: 'policy',
      resourceId: policyId,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(200).json({
      policy,
    });
  } catch (error) {
    logger.error('Get policy error', { error, userId: req.user?.userId });
    next(error);
  }
}

/**
 * Get red flags for a policy
 * GET /api/v1/policy-pulse/red-flags/:policyId
 */
export async function getRedFlags(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { policyId } = req.params;

    if (!policyId) {
      res.status(400).json({ error: 'Policy ID is required' });
      return;
    }

    // Import redFlag service dynamically to avoid circular dependency
    const redFlagService = await import('../services/redFlag.service');

    // Check if red flags already exist in database
    let report = await redFlagService.getRedFlagReport(policyId, userId);

    // If not found, analyze the policy
    if (!report) {
      report = await redFlagService.detectRedFlags(policyId, userId);
    }

    // Log audit trail
    await logAudit({
      userId,
      actionType: 'RED_FLAG_ANALYSIS',
      resourceType: 'policy',
      resourceId: policyId,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        redFlagCount: report.redFlags.length,
        overallRisk: report.overallRisk,
        misSellingSuspicion: report.misSellingSuspicion,
      },
    });

    res.status(200).json({
      report,
    });
  } catch (error) {
    logger.error('Get red flags error', { error, userId: req.user?.userId });
    next(error);
  }
}

/**
 * File grievance with IRDAI Bima Bharosa
 * POST /api/v1/policy-pulse/file-grievance
 */
export async function fileGrievance(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { policyId, complainantDetails, grievanceDescription } = req.body;

    if (!policyId || !complainantDetails || !grievanceDescription) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Import services dynamically
    const redFlagService = await import('../services/redFlag.service');
    const bimaBharosaService = await import('../services/bimaBharosa.service');

    // Get red flag report
    let report = await redFlagService.getRedFlagReport(policyId, userId);
    if (!report) {
      report = await redFlagService.detectRedFlags(policyId, userId);
    }

    // Submit grievance
    const response = await bimaBharosaService.fileGrievance({
      policyId,
      userId,
      redFlagReport: report,
      complainantDetails,
      grievanceDescription,
    });

    // Log audit trail
    await logAudit({
      userId,
      actionType: 'GRIEVANCE_FILED',
      resourceType: 'policy',
      resourceId: policyId,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        referenceNumber: response.referenceNumber,
        redFlagCount: report.redFlags.length,
      },
    });

    res.status(200).json({
      message: 'Grievance filed successfully',
      response,
    });
  } catch (error) {
    logger.error('File grievance error', { error, userId: req.user?.userId });
    next(error);
  }
}

/**
 * Compare policy coverage with similar policies
 * POST /api/v1/policy-pulse/compare/:policyId
 */
export async function comparePolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { policyId } = req.params;

    if (!policyId) {
      res.status(400).json({ error: 'Policy ID is required' });
      return;
    }

    const startTime = Date.now();

    // Import coverage comparison service
    const coverageComparisonService = await import('../services/coverageComparison.service');

    // Compare policies
    const report = await coverageComparisonService.comparePolices(policyId, userId);

    const duration = Date.now() - startTime;

    // Log audit trail
    await logAudit({
      userId,
      actionType: 'POLICY_COMPARISON',
      resourceType: 'policy',
      resourceId: policyId,
      outcome: 'SUCCESS',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        similarPoliciesCount: report.similarPolicies.length,
        shouldSwitch: report.switchingRecommendation.shouldSwitch,
        duration,
      },
    });

    logger.info('Policy comparison completed', {
      userId,
      policyId,
      duration,
    });

    res.status(200).json({
      report,
    });
  } catch (error) {
    logger.error('Policy comparison error', { error, userId: req.user?.userId });
    next(error);
  }
}
