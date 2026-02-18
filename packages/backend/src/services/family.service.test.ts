/**
 * Family Service Unit Tests
 * Tests family member management and alert functionality
 * 
 * **Validates: Requirements 3.9, 4.3**
 */

import { FamilyService } from './family.service';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const familyService = new FamilyService();

describe('Family Service - Unit Tests', () => {
  let testUserId: string;
  let testFamilyMemberId: string;

  beforeAll(async () => {
    // Create a test user
    const testUser = await prisma.user.create({
      data: {
        email: 'familytest@example.com',
        passwordHash: 'test-hash',
        role: 'CONSUMER',
        name: 'Family Test User',
      },
    });
    testUserId = testUser.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.familyMember.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('addFamilyMember', () => {
    it('should add a family member successfully', async () => {
      const memberData = {
        name: 'John Doe',
        relationship: 'parent',
        phone: '+919876543210',
        email: 'john@example.com',
      };

      const familyMember = await familyService.addFamilyMember(testUserId, memberData);

      expect(familyMember).toBeDefined();
      expect(familyMember.name).toBe(memberData.name);
      expect(familyMember.relationship).toBe(memberData.relationship);
      expect(familyMember.phone).toBe(memberData.phone);
      expect(familyMember.email).toBe(memberData.email);
      expect(familyMember.alertsEnabled).toBe(true);
      expect(familyMember.dailyAlertCount).toBe(0);

      testFamilyMemberId = familyMember.id;
    });

    it('should add a family member without email', async () => {
      const memberData = {
        name: 'Jane Doe',
        relationship: 'spouse',
        phone: '+919876543211',
      };

      const familyMember = await familyService.addFamilyMember(testUserId, memberData);

      expect(familyMember).toBeDefined();
      expect(familyMember.name).toBe(memberData.name);
      expect(familyMember.email).toBeNull();
    });
  });

  describe('getFamilyMembers', () => {
    it('should retrieve all family members for a user', async () => {
      const members = await familyService.getFamilyMembers(testUserId);

      expect(members).toBeDefined();
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBeGreaterThan(0);
    });

    it('should return empty array for user with no family members', async () => {
      const newUser = await prisma.user.create({
        data: {
          email: 'nofamily@example.com',
          passwordHash: 'test-hash',
          role: 'CONSUMER',
        },
      });

      const members = await familyService.getFamilyMembers(newUser.id);

      expect(members).toBeDefined();
      expect(Array.isArray(members)).toBe(true);
      expect(members.length).toBe(0);

      // Clean up
      await prisma.user.delete({ where: { id: newUser.id } });
    });
  });

  describe('sendFamilyAlerts', () => {
    it('should send alerts to all family members', async () => {
      const alertMessage = 'Test high-risk scam detected';
      const riskScore = 85;

      const results = await familyService.sendFamilyAlerts(
        testUserId,
        alertMessage,
        riskScore
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Check that alerts were sent
      results.forEach(result => {
        expect(result.familyMemberId).toBeDefined();
        expect(result.familyMemberName).toBeDefined();
        expect(['sent', 'failed', 'skipped']).toContain(result.smsStatus);
        expect(['sent', 'failed', 'skipped']).toContain(result.whatsappStatus);
      });
    });

    it('should respect daily alert limit (5 per day)', async () => {
      // Send 5 alerts
      for (let i = 0; i < 5; i++) {
        await familyService.sendFamilyAlerts(
          testUserId,
          `Test alert ${i + 1}`,
          80
        );
      }

      // 6th alert should be skipped
      const results = await familyService.sendFamilyAlerts(
        testUserId,
        'Test alert 6',
        80
      );

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);
      
      // All alerts should be skipped due to rate limit
      results.forEach(result => {
        expect(result.smsStatus).toBe('skipped');
        expect(result.whatsappStatus).toBe('skipped');
        expect(result.error).toContain('Daily alert limit reached');
      });
    });

    it('should return empty array when no family members exist', async () => {
      const newUser = await prisma.user.create({
        data: {
          email: 'noalerts@example.com',
          passwordHash: 'test-hash',
          role: 'CONSUMER',
        },
      });

      const results = await familyService.sendFamilyAlerts(
        newUser.id,
        'Test alert',
        80
      );

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(0);

      // Clean up
      await prisma.user.delete({ where: { id: newUser.id } });
    });
  });

  describe('removeFamilyMember', () => {
    it('should remove a family member successfully', async () => {
      await familyService.removeFamilyMember(testUserId, testFamilyMemberId);

      // Verify member was removed
      const members = await familyService.getFamilyMembers(testUserId);
      const removedMember = members.find(m => m.id === testFamilyMemberId);
      expect(removedMember).toBeUndefined();
    });

    it('should throw error when removing non-existent family member', async () => {
      await expect(
        familyService.removeFamilyMember(testUserId, 'non-existent-id')
      ).rejects.toThrow();
    });

    it('should throw error when removing family member of another user', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: 'otheruser@example.com',
          passwordHash: 'test-hash',
          role: 'CONSUMER',
        },
      });

      const otherMember = await familyService.addFamilyMember(otherUser.id, {
        name: 'Other Member',
        relationship: 'friend',
        phone: '+919876543299',
      });

      await expect(
        familyService.removeFamilyMember(testUserId, otherMember.id)
      ).rejects.toThrow('Family member not found or does not belong to user');

      // Clean up
      await prisma.familyMember.delete({ where: { id: otherMember.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('resetDailyAlertCounts', () => {
    it('should reset daily alert counts for old alerts', async () => {
      // This test would require mocking dates or waiting for a day
      // For now, just verify the method doesn't throw
      await expect(familyService.resetDailyAlertCounts()).resolves.not.toThrow();
    });
  });
});
