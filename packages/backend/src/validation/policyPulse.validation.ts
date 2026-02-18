import Joi from 'joi';

export const uploadPolicySchema = Joi.object({
  // File validation is handled by multer middleware
  // This schema is for any additional body parameters if needed
});

export const getPolicySchema = Joi.object({
  policyId: Joi.string().uuid().required(),
});
