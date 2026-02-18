import { Router } from 'express';
import multer from 'multer';
import * as policyPulseController from '../controllers/policyPulse.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import * as policyPulseValidation from '../validation/policyPulse.validation';

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// All routes require authentication
router.use(authenticate);

// Upload and parse policy PDF
router.post(
  '/upload-policy',
  upload.single('policy'),
  policyPulseController.uploadPolicy
);

// Get parsed policy by ID
router.get(
  '/policy/:policyId',
  validate(policyPulseValidation.getPolicySchema, 'params'),
  policyPulseController.getPolicy
);

// Get red flags for a policy
router.get(
  '/red-flags/:policyId',
  validate(policyPulseValidation.getPolicySchema, 'params'),
  policyPulseController.getRedFlags
);

// File grievance with IRDAI Bima Bharosa
router.post(
  '/file-grievance',
  policyPulseController.fileGrievance
);

// Compare policy coverage with similar policies
router.post(
  '/compare/:policyId',
  validate(policyPulseValidation.getPolicySchema, 'params'),
  policyPulseController.comparePolicy
);

export default router;
