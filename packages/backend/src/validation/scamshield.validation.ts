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
