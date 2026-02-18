/**
 * ScamShield Routes
 * API routes for scam detection and analysis
 */

import { Router } from 'express';
import multer from 'multer';
import { scamShieldController } from '../controllers/scamshield.controller';
import { authenticate } from '../middleware/authenticate';
import { validate } from '../middleware/validate';
import { analyzeMessageSchema, verifyPhoneSchema } from '../validation/scamshield.validation';
import familyRoutes from './family.routes';

const router = Router();

// Configure multer for video uploads (memory storage)
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed formats: MP4, MPEG, MOV, AVI, WEBM'));
    }
  },
});

/**
 * POST /api/v1/scamshield/analyze-message
 * Analyze a message for scam patterns
 * 
 * Authentication: Optional (can be used by anonymous users)
 * Rate limit: 100 requests per minute
 */
router.post(
  '/analyze-message',
  validate(analyzeMessageSchema),
  scamShieldController.analyzeMessage.bind(scamShieldController)
);

/**
 * POST /api/v1/scamshield/verify-phone
 * Verify a phone number against telemarketer registry
 * 
 * Authentication: Optional (can be used by anonymous users)
 * Rate limit: 100 requests per minute
 */
router.post(
  '/verify-phone',
  validate(verifyPhoneSchema),
  scamShieldController.verifyPhoneNumber.bind(scamShieldController)
);

/**
 * POST /api/v1/scamshield/analyze-video
 * Analyze a video for deepfake indicators
 * 
 * Authentication: Required
 * Rate limit: 20 requests per minute (strict limit due to computational cost)
 * Max file size: 100MB
 */
router.post(
  '/analyze-video',
  authenticate,
  videoUpload.single('video'),
  scamShieldController.analyzeVideo.bind(scamShieldController)
);

// Mount family alert routes
router.use(familyRoutes);

export default router;
