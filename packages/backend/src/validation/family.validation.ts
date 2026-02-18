/**
 * Family Alert Validation Schemas
 * Joi validation schemas for family member management
 */

import Joi from 'joi';

export const addFamilyMemberSchema = Joi.object({
  name: Joi.string()
    .required()
    .min(2)
    .max(255)
    .messages({
      'string.empty': 'Name cannot be empty',
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name cannot exceed 255 characters',
      'any.required': 'Name is required',
    }),
  relationship: Joi.string()
    .required()
    .valid(
      'parent',
      'spouse',
      'child',
      'sibling',
      'grandparent',
      'grandchild',
      'friend',
      'other'
    )
    .messages({
      'any.only': 'Relationship must be one of: parent, spouse, child, sibling, grandparent, grandchild, friend, other',
      'any.required': 'Relationship is required',
    }),
  phone: Joi.string()
    .required()
    .pattern(/^\+?91[-\s]?[6-9]\d{9}$/)
    .messages({
      'string.pattern.base': 'Invalid Indian phone number format',
      'any.required': 'Phone number is required',
    }),
  email: Joi.string()
    .email()
    .optional()
    .allow('')
    .messages({
      'string.email': 'Invalid email format',
    }),
});

export const removeFamilyMemberSchema = Joi.object({
  familyMemberId: Joi.string()
    .required()
    .uuid()
    .messages({
      'string.guid': 'Invalid family member ID format',
      'any.required': 'Family member ID is required',
    }),
});
