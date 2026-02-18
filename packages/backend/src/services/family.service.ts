/**
 * Family Alert Service
 * Manages family members and sends scam alerts
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { notificationService } from './notification.service';
import {
  FamilyMember,
  AddFamilyMemberRequest,
  SendAlertResult,
} from '../types/family';

const prisma = new PrismaClient();

export class FamilyService {
  /**
   * Add a family member to receive alerts
   * @param userId - User ID
   * @param memberData - Family member information
   * @returns Created family member
   */
  async addFamilyMember(
    userId: string,
    memberData: AddFamilyMemberRequest
  ): Promise<FamilyMember> {
    try {
      const familyMember = await prisma.familyMember.create({
        data: {
          userId,
          name: memberData.name,
          relationship: memberData.relationship,
          phone: memberData.phone,
          email: memberData.email,
          alertsEnabled: true,
          dailyAlertCount: 0,
        },
      });

      logger.info('Family member added', {
        userId,
        familyMemberId: familyMember.id,
        name: memberData.name,
      });

      return familyMember as FamilyMember;
    } catch (error) {
      logger.error('Error adding family member', { error, userId, memberData });
      throw error;
    }
  }

  /**
   * Remove a family member
   * @param userId - User ID
   * @param familyMemberId - Family member ID to remove
   */
  async removeFamilyMember(userId: string, familyMemberId: string): Promise<void> {
    try {
      // Verify the family member belongs to the user
      const familyMember = await prisma.familyMember.findFirst({
        where: {
          id: familyMemberId,
          userId,
        },
      });

      if (!familyMember) {
        throw new Error('Family member not found or does not belong to user');
      }

      await prisma.familyMember.delete({
        where: { id: familyMemberId },
      });

      logger.info('Family member removed', { userId, familyMemberId });
    } catch (error) {
      logger.error('Error removing family member', { error, userId, familyMemberId });
      throw error;
    }
  }

  /**
   * Get all family members for a user
   * @param userId - User ID
   * @returns List of family members
   */
  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    try {
      const members = await prisma.familyMember.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });

      return members as FamilyMember[];
    } catch (error) {
      logger.error('Error fetching family members', { error, userId });
      throw error;
    }
  }

  /**
   * Send alert to all family members when high-risk scam detected
   * @param userId - User ID
   * @param alertMessage - Alert message content
   * @param riskScore - Risk score that triggered the alert
   * @returns Results for each family member
   */
  async sendFamilyAlerts(
    userId: string,
    alertMessage: string,
    riskScore: number
  ): Promise<SendAlertResult[]> {
    try {
      // Get all family members with alerts enabled
      const familyMembers = await prisma.familyMember.findMany({
        where: {
          userId,
          alertsEnabled: true,
        },
      });

      if (familyMembers.length === 0) {
        logger.info('No family members to alert', { userId });
        return [];
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const results: SendAlertResult[] = [];

      for (const member of familyMembers) {
        // Check rate limit (max 5 alerts per day per family member)
        const lastAlertDate = member.lastAlertDate
          ? new Date(member.lastAlertDate)
          : null;
        const isToday =
          lastAlertDate &&
          lastAlertDate.getTime() === today.getTime();

        if (isToday && member.dailyAlertCount >= 5) {
          logger.warn('Daily alert limit reached for family member', {
            familyMemberId: member.id,
            dailyAlertCount: member.dailyAlertCount,
          });

          results.push({
            success: false,
            familyMemberId: member.id,
            familyMemberName: member.name,
            smsStatus: 'skipped',
            whatsappStatus: 'skipped',
            error: 'Daily alert limit reached (5 alerts per day)',
          });
          continue;
        }

        // Format alert message
        const formattedMessage = `🚨 SCAM ALERT for ${member.name}!\n\n${alertMessage}\n\nRisk Score: ${riskScore}/100\n\nPlease contact your family member immediately to verify their safety.\n\n- SageSure India ScamShield`;

        // Send notifications
        const notificationResult = await notificationService.sendNotification(
          member.phone,
          formattedMessage
        );

        // Store alert in database
        await prisma.familyAlert.create({
          data: {
            userId,
            familyMemberId: member.id,
            alertType: 'HIGH_RISK_SCAM',
            alertMessage: formattedMessage,
            acknowledged: false,
          },
        });

        // Update daily alert count
        const newCount = isToday ? member.dailyAlertCount + 1 : 1;
        await prisma.familyMember.update({
          where: { id: member.id },
          data: {
            dailyAlertCount: newCount,
            lastAlertDate: today,
          },
        });

        results.push({
          success: notificationResult.sms || notificationResult.whatsapp,
          familyMemberId: member.id,
          familyMemberName: member.name,
          smsStatus: notificationResult.sms ? 'sent' : 'failed',
          whatsappStatus: notificationResult.whatsapp ? 'sent' : 'failed',
        });

        logger.info('Family alert sent', {
          userId,
          familyMemberId: member.id,
          smsStatus: notificationResult.sms,
          whatsappStatus: notificationResult.whatsapp,
        });
      }

      return results;
    } catch (error) {
      logger.error('Error sending family alerts', { error, userId });
      throw error;
    }
  }

  /**
   * Reset daily alert counts (should be run daily via cron job)
   */
  async resetDailyAlertCounts(): Promise<void> {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      await prisma.familyMember.updateMany({
        where: {
          lastAlertDate: {
            lt: yesterday,
          },
        },
        data: {
          dailyAlertCount: 0,
        },
      });

      logger.info('Daily alert counts reset');
    } catch (error) {
      logger.error('Error resetting daily alert counts', { error });
      throw error;
    }
  }
}

export const familyService = new FamilyService();
