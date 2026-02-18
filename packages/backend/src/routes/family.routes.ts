/**
 * Family Alert Routes
 * API routes for family member management
 */

import { Router } from 'express';
import { familyController } from '../controllers/family.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { addFamilyMemberSchema } from '../validation/family.validation';

const router = Router();

/**
 * POST /api/v1/scamshield/add-family-member
 * Add a family member to receive scam alerts
 * 
 * Authentication: Required
 * Rate limit: 100 requests per minute
 */
router.post(
  '/add-family-member',
  authenticate,
  validate(addFamilyMemberSchema),
  familyController.addFamilyMember.bind(familyController)
);

/**
 * DELETE /api/v1/scamshield/remove-family-member/:familyMemberId
 * Remove a family member
 * 
 * Authentication: Required
 * Rate limit: 100 requests per minute
 */
router.delete(
  '/remove-family-member/:familyMemberId',
  authenticate,
  familyController.removeFamilyMember.bind(familyController)
);

/**
 * GET /api/v1/scamshield/family-members
 * Get all family members for the authenticated user
 * 
 * Authentication: Required
 * Rate limit: 100 requests per minute
 */
router.get(
  '/family-members',
  authenticate,
  familyController.getFamilyMembers.bind(familyController)
);

export default router;
