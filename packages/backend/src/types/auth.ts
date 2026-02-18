/**
 * Authentication types and interfaces for SageSure India Platform
 */

export enum UserRole {
  CONSUMER = 'CONSUMER',
  BROKER = 'BROKER',
  AGENT = 'AGENT',
  INSURER = 'INSURER',
  REGULATOR = 'REGULATOR',
  ADMIN = 'ADMIN'
}

export interface AuthTokens {
  accessToken: string;  // JWT, 24h expiry
  refreshToken: string; // JWT, 30d expiry
  mfaRequired?: boolean; // Indicates if MFA verification is needed
  userId?: string; // User ID for MFA verification
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: UserRole;
  name?: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface SendOTPRequest {
  userId: string;
}

export interface VerifyOTPRequest {
  userId: string;
  otp: string;
}
