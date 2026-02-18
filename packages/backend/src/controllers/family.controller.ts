/**
 * Family Alert Controller
 * Handles HTTP requests for family member management
 */

import { Request, Response, NextFunction } from 'express';
import { familyService } from '../services/family.service';
import { logger } from '../utils/logger';
import { auditLog } from '../utils/auditLogger';

export class FamilyController {
  /**
   * POST /api/v1/scamshield/add-family-member
   * Add a family member to receive alerts
   */
  async addFamilyMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { name, relationship, phone, email } = req.body;

      const familyMember = await familyService.addFamilyMember(userId, {
        name,
        relationship,
        phone,
        email,
      });

      // Audit log
      await auditLog({
        userId,
        actionType: 'ADD_FAMILY_MEMBER',
        resourceType: 'FAMILY_MEMBER',
        resourceId: familyMember.id,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        outcome: 'SUCCESS',
        details: {
          name: familyMember.name,
          relationship: familyMember.relationship,
        },
      });

      res.status(201).json({
        success: true,
        data: familyMember,
      });
    } catch (error) {
      logger.error('Error in addFamilyMember controller', { error });
      next(error);
    }
  }

  /**
   * DELETE /api/v1/scamshield/remove-family-member/:familyMemberId
   * Remove a family member
   */
  async removeFamilyMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { familyMemberId } = req.params;

      await familyService.removeFamilyMember(userId, familyMemberId);

      // Audit log
      await auditLog({
        userId,
        actionType: 'REMOVE_FAMILY_MEMBER',
        resourceType: 'FAMILY_MEMBER',
        resourceId: familyMemberId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        outcome: 'SUCCESS',
        details: {},
      });

      res.status(200).json({
        success: true,
        message: 'Family member removed successfully',
      });
    } catch (error) {
      logger.error('Error in removeFamilyMember controller', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/scamshield/family-members
   * Get all family members for the authenticated user
   */
  async getFamilyMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const familyMembers = await familyService.getFamilyMembers(userId);

      res.status(200).json({
        success: true,
        data: familyMembers,
      });
    } catch (error) {
      logger.error('Error in getFamilyMembers controller', { error });
      next(error);
    }
  }
}

export const familyController = new FamilyController();
