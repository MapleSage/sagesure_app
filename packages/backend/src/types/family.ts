/**
 * Family Alert System Types
 * Types for family member management and alert notifications
 */

export interface FamilyMember {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  alertsEnabled: boolean;
  dailyAlertCount: number;
  lastAlertDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddFamilyMemberRequest {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

export interface FamilyAlert {
  id: string;
  userId: string;
  familyMemberId: string;
  alertType: string;
  alertMessage: string;
  sentAt: Date;
  acknowledged: boolean;
}

export interface AlertNotification {
  familyMemberId: string;
  familyMemberName: string;
  phone: string;
  email?: string;
  message: string;
  alertType: string;
}

export interface SendAlertResult {
  success: boolean;
  familyMemberId: string;
  familyMemberName: string;
  smsStatus: 'sent' | 'failed' | 'skipped';
  whatsappStatus: 'sent' | 'failed' | 'skipped';
  error?: string;
}
