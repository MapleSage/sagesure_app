/**
 * ScamShield Validation Schemas
 * Joi validation schemas for ScamShield endpoints
 */

import Joi from 'joi';

export const analyzeMessageSchema = Joi.object({
  message: Joi.string()
    .required()
    .min(1)
    .max(10000)
    .messages({
      'string.empty': 'Message cannot be empty',
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message cannot exceed 10,000 characters',
      'any.required': 'Message is required',
    }),
});

export const verifyPhoneSchema = Joi.object({
  phoneNumber: Joi.string()
    .required()
    .pattern(/^\+?91[-\s]?[6-9]\d{9}$|^1800[-\s]?\d{3}[-\s]?\d{4}$/)
    .messages({
      'string.pattern.base': 'Invalid Indian phone number format',
      'any.required': 'Phone number is required',
    }),
});

export const verifyBrandSchema = Joi.object({
  brandName: Joi.string()
    .required()
    .min(2)
    .max(255)
    .messages({
      'string.empty': 'Brand name cannot be empty',
      'string.min': 'Brand name must be at least 2 characters',
      'string.max': 'Brand name cannot exceed 255 characters',
      'any.required': 'Brand name is required',
    }),
});

export const report1930Schema = Joi.object({
  scamType: Joi.string()
    .required()
    .max(100)
    .messages({
      'string.empty': 'Scam type cannot be empty',
      'string.max': 'Scam type cannot exceed 100 characters',
      'any.required': 'Scam type is required',
    }),
  scammerContact: Joi.string()
    .optional()
    .max(255)
    .messages({
      'string.max': 'Scammer contact cannot exceed 255 characters',
    }),
  amountInvolved: Joi.number()
    .optional()
    .min(0)
    .messages({
      'number.min': 'Amount involved must be non-negative',
    }),
  description: Joi.string()
    .required()
    .min(10)
    .max(5000)
    .messages({
      'string.empty': 'Description cannot be empty',
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 5,000 characters',
      'any.required': 'Description is required',
    }),
  evidenceUrls: Joi.array()
    .items(Joi.string().uri())
    .optional()
    .messages({
      'array.base': 'Evidence URLs must be an array',
      'string.uri': 'Each evidence URL must be a valid URI',
    }),
  incidentDateTime: Joi.date()
    .optional()
    .max('now')
    .messages({
      'date.max': 'Incident date cannot be in the future',
    }),
});

export const reportChakshuSchema = Joi.object({
  phoneNumber: Joi.string()
    .required()
    .pattern(/^\+?91[-\s]?[6-9]\d{9}$/)
    .messages({
      'string.pattern.base': 'Invalid Indian phone number format',
      'any.required': 'Phone number is required',
    }),
  complaintType: Joi.string()
    .required()
    .valid('TELEMARKETING', 'FINANCIAL_FRAUD', 'PHISHING', 'OTHER')
    .messages({
      'any.only': 'Complaint type must be one of: TELEMARKETING, FINANCIAL_FRAUD, PHISHING, OTHER',
      'any.required': 'Complaint type is required',
    }),
  description: Joi.string()
    .required()
    .min(10)
    .max(2000)
    .messages({
      'string.empty': 'Description cannot be empty',
      'string.min': 'Description must be at least 10 characters',
      'string.max': 'Description cannot exceed 2,000 characters',
      'any.required': 'Description is required',
    }),
  callDateTime: Joi.date()
    .optional()
    .max('now')
    .messages({
      'date.max': 'Call date cannot be in the future',
    }),
});

