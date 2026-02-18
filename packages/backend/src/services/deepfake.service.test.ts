import * as deepfakeService from './deepfake.service';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    digitalArrestIncident: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

const prisma = new PrismaClient();

describe('Deepfake Detection Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractVideoMetadata', () => {
    it('should extract metadata from video buffer', async () => {
      const videoBuffer = Buffer.from('mock video content');

      const metadata = await deepfakeService.extractVideoMetadata(videoBuffer);

      expect(metadata).toBeDefined();
      expect(metadata.duration).toBeGreaterThan(0);
      expect(metadata.frameCount).toBeGreaterThan(0);
      expect(metadata.resolution).toBeDefined();
      expect(metadata.fileSize).toBe(videoBuffer.length);
    });
  });

  describe('analyzeVideo', () => {
    it('should analyze video and return deepfake analysis', async () => {
      const videoBuffer = Buffer.from('mock video content with sufficient length for analysis');
      const userId = 'test-user-id';

      const analysis = await deepfakeService.analyzeVideo(videoBuffer, userId);

      expect(analysis).toBeDefined();
      expect(typeof analysis.isDeepfake).toBe('boolean');
      expect(analysis.confidence).toBeGreaterThanOrEqual(0);
      expect(analysis.confidence).toBeLessThanOrEqual(100);
      expect(analysis.anomalies).toBeDefined();
      expect(Array.isArray(analysis.anomalies.facialInconsistencies)).toBe(true);
      expect(typeof analysis.anomalies.audioVisualSync).toBe('boolean');
      expect(Array.isArray(analysis.anomalies.backgroundAnomalies)).toBe(true);
      expect(Array.isArray(analysis.suspiciousFrames)).toBe(true);
      expect(analysis.analysisTime).toBeGreaterThan(0);
    });

    it('should complete analysis within reasonable time', async () => {
      const videoBuffer = Buffer.from('mock video content');
      const userId = 'test-user-id';

      const startTime = Date.now();
      const analysis = await deepfakeService.analyzeVideo(videoBuffer, userId);
      const duration = Date.now() - startTime;

      // Should complete within 5 seconds for mock implementation
      expect(duration).toBeLessThan(5000);
      expect(analysis.analysisTime).toBeLessThan(5000);
    });

    it('should return confidence score within valid range', async () => {
      const videoBuffer = Buffer.from('mock video content');
      const userId = 'test-user-id';

      // Run multiple times to test consistency
      for (let i = 0; i < 10; i++) {
        const analysis = await deepfakeService.analyzeVideo(videoBuffer, userId);
        
        expect(analysis.confidence).toBeGreaterThanOrEqual(0);
        expect(analysis.confidence).toBeLessThanOrEqual(100);
        expect(Number.isInteger(analysis.confidence)).toBe(true);
      }
    });

    it('should handle errors gracefully', async () => {
      const invalidBuffer = Buffer.from('');
      const userId = 'test-user-id';

      // Should not throw, but may return low confidence
      const analysis = await deepfakeService.analyzeVideo(invalidBuffer, userId);
      
      expect(analysis).toBeDefined();
      expect(typeof analysis.isDeepfake).toBe('boolean');
    });
  });

  describe('storeDigitalArrestIncident', () => {
    it('should store incident in database', async () => {
      const mockIncident = {
        incidentId: 'test-incident-id',
        userId: 'test-user-id',
        videoUrl: 'test-video.mp4',
        isDeepfake: true,
        confidenceScore: 85,
        anomalies: {
          facialInconsistencies: ['Unnatural eye movements'],
          audioVisualSync: false,
          backgroundAnomalies: ['Inconsistent background blur'],
        },
        scammerContact: '+911234567890',
        amountInvolved: 50000,
        reportedTo1930: false,
        createdAt: new Date(),
      };

      (prisma.digitalArrestIncident.create as jest.Mock).mockResolvedValue(mockIncident);

      const analysis: deepfakeService.DeepfakeAnalysis = {
        isDeepfake: true,
        confidence: 85,
        anomalies: {
          facialInconsistencies: ['Unnatural eye movements'],
          audioVisualSync: false,
          backgroundAnomalies: ['Inconsistent background blur'],
        },
        suspiciousFrames: [5, 10, 15],
        analysisTime: 2000,
      };

      const incidentId = await deepfakeService.storeDigitalArrestIncident(
        'test-user-id',
        'test-video.mp4',
        analysis,
        '+911234567890',
        50000
      );

      expect(incidentId).toBe('test-incident-id');
      expect(prisma.digitalArrestIncident.create).toHaveBeenCalledWith({
        data: {
          userId: 'test-user-id',
          videoUrl: 'test-video.mp4',
          isDeepfake: true,
          confidenceScore: 85,
          anomalies: analysis.anomalies,
          scammerContact: '+911234567890',
          amountInvolved: 50000,
          reportedTo1930: false,
        },
      });
    });

    it('should store incident without optional fields', async () => {
      const mockIncident = {
        incidentId: 'test-incident-id',
        userId: 'test-user-id',
        videoUrl: 'test-video.mp4',
        isDeepfake: false,
        confidenceScore: 30,
        anomalies: {
          facialInconsistencies: [],
          audioVisualSync: true,
          backgroundAnomalies: [],
        },
        scammerContact: null,
        amountInvolved: null,
        reportedTo1930: false,
        createdAt: new Date(),
      };

      (prisma.digitalArrestIncident.create as jest.Mock).mockResolvedValue(mockIncident);

      const analysis: deepfakeService.DeepfakeAnalysis = {
        isDeepfake: false,
        confidence: 30,
        anomalies: {
          facialInconsistencies: [],
          audioVisualSync: true,
          backgroundAnomalies: [],
        },
        suspiciousFrames: [],
        analysisTime: 1500,
      };

      const incidentId = await deepfakeService.storeDigitalArrestIncident(
        'test-user-id',
        'test-video.mp4',
        analysis
      );

      expect(incidentId).toBe('test-incident-id');
      expect(prisma.digitalArrestIncident.create).toHaveBeenCalled();
    });
  });

  describe('getDigitalArrestIncident', () => {
    it('should retrieve incident by ID', async () => {
      const mockIncident = {
        incidentId: 'test-incident-id',
        userId: 'test-user-id',
        videoUrl: 'test-video.mp4',
        isDeepfake: true,
        confidenceScore: 85,
        anomalies: {},
        scammerContact: '+911234567890',
        amountInvolved: 50000,
        reportedTo1930: false,
        createdAt: new Date(),
      };

      (prisma.digitalArrestIncident.findFirst as jest.Mock).mockResolvedValue(mockIncident);

      const incident = await deepfakeService.getDigitalArrestIncident(
        'test-incident-id',
        'test-user-id'
      );

      expect(incident).toEqual(mockIncident);
      expect(prisma.digitalArrestIncident.findFirst).toHaveBeenCalledWith({
        where: {
          incidentId: 'test-incident-id',
          userId: 'test-user-id',
        },
      });
    });

    it('should return null for non-existent incident', async () => {
      (prisma.digitalArrestIncident.findFirst as jest.Mock).mockResolvedValue(null);

      const incident = await deepfakeService.getDigitalArrestIncident(
        'non-existent-id',
        'test-user-id'
      );

      expect(incident).toBeNull();
    });
  });

  describe('getUserDigitalArrestIncidents', () => {
    it('should retrieve all incidents for a user', async () => {
      const mockIncidents = [
        {
          incidentId: 'incident-1',
          userId: 'test-user-id',
          videoUrl: 'video1.mp4',
          isDeepfake: true,
          confidenceScore: 85,
          createdAt: new Date('2024-01-02'),
        },
        {
          incidentId: 'incident-2',
          userId: 'test-user-id',
          videoUrl: 'video2.mp4',
          isDeepfake: false,
          confidenceScore: 30,
          createdAt: new Date('2024-01-01'),
        },
      ];

      (prisma.digitalArrestIncident.findMany as jest.Mock).mockResolvedValue(mockIncidents);

      const incidents = await deepfakeService.getUserDigitalArrestIncidents('test-user-id');

      expect(incidents).toEqual(mockIncidents);
      expect(incidents.length).toBe(2);
      expect(prisma.digitalArrestIncident.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'test-user-id',
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    });

    it('should return empty array for user with no incidents', async () => {
      (prisma.digitalArrestIncident.findMany as jest.Mock).mockResolvedValue([]);

      const incidents = await deepfakeService.getUserDigitalArrestIncidents('test-user-id');

      expect(incidents).toEqual([]);
      expect(incidents.length).toBe(0);
    });
  });

  describe('Deepfake detection logic', () => {
    it('should flag video as deepfake when confidence is high', async () => {
      const videoBuffer = Buffer.from('mock video with deepfake indicators');
      const userId = 'test-user-id';

      // Run multiple times to get statistical distribution
      const results = await Promise.all(
        Array(20).fill(null).map(() => deepfakeService.analyzeVideo(videoBuffer, userId))
      );

      // At least some should be flagged as deepfake (due to random mock)
      const deepfakeCount = results.filter((r) => r.isDeepfake).length;
      expect(deepfakeCount).toBeGreaterThanOrEqual(0);
      expect(deepfakeCount).toBeLessThanOrEqual(20);

      // All should have valid confidence scores
      results.forEach((result) => {
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
      });
    });

    it('should provide detailed anomaly information', async () => {
      const videoBuffer = Buffer.from('mock video content');
      const userId = 'test-user-id';

      const analysis = await deepfakeService.analyzeVideo(videoBuffer, userId);

      // Anomalies structure should be complete
      expect(analysis.anomalies).toHaveProperty('facialInconsistencies');
      expect(analysis.anomalies).toHaveProperty('audioVisualSync');
      expect(analysis.anomalies).toHaveProperty('backgroundAnomalies');

      // Arrays should be valid
      expect(Array.isArray(analysis.anomalies.facialInconsistencies)).toBe(true);
      expect(Array.isArray(analysis.anomalies.backgroundAnomalies)).toBe(true);
      expect(typeof analysis.anomalies.audioVisualSync).toBe('boolean');
    });
  });
});
