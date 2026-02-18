/**
 * Validation Middleware
 * Validates request body against Joi schemas
 */

import { Request, Response, NextFunction } from 'express';
import { Schema } from 'joi';
import { logger } from '../utils/logger';

/**
 * Middleware to validate request body against a Joi schema
 * 
 * @param schema - Joi validation schema
 * @returns Express middleware function
 */
export const validate = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      logger.warn('Validation error', {
        path: req.path,
        errors,
      });

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors,
      });
      return;
    }

    // Replace request body with validated and sanitized value
    req.body = value;
    next();
  };
};
