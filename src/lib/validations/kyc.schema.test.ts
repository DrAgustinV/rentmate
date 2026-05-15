import { describe, it, expect } from 'vitest';
import {
  isKYCVerified,
  isKYCPending,
  isKYCRejectedOrExpired,
  canInitiateKYC,
  isKYCExpiringSoon,
  getKYCStatusErrorMessage,
  KYCStatusEnum,
} from './kyc.schema';

describe('KYC Schema Pure Functions', () => {
  describe('isKYCVerified', () => {
    it('should return true when status is verified', () => {
      expect(isKYCVerified('verified')).toBe(true);
    });

    it('should return false for all other statuses', () => {
      expect(isKYCVerified('not_started')).toBe(false);
      expect(isKYCVerified('pending')).toBe(false);
      expect(isKYCVerified('in_progress')).toBe(false);
      expect(isKYCVerified('rejected')).toBe(false);
      expect(isKYCVerified('expired')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isKYCVerified(null)).toBe(false);
      expect(isKYCVerified(undefined)).toBe(false);
    });
  });

  describe('isKYCPending', () => {
    it('should return true when status is pending', () => {
      expect(isKYCPending('pending')).toBe(true);
    });

    it('should return true when status is in_progress', () => {
      expect(isKYCPending('in_progress')).toBe(true);
    });

    it('should return false for all other statuses', () => {
      expect(isKYCPending('not_started')).toBe(false);
      expect(isKYCPending('verified')).toBe(false);
      expect(isKYCPending('rejected')).toBe(false);
      expect(isKYCPending('expired')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isKYCPending(null)).toBe(false);
      expect(isKYCPending(undefined)).toBe(false);
    });
  });

  describe('isKYCRejectedOrExpired', () => {
    it('should return true when status is rejected', () => {
      expect(isKYCRejectedOrExpired('rejected')).toBe(true);
    });

    it('should return true when status is expired', () => {
      expect(isKYCRejectedOrExpired('expired')).toBe(true);
    });

    it('should return false for all other statuses', () => {
      expect(isKYCRejectedOrExpired('not_started')).toBe(false);
      expect(isKYCRejectedOrExpired('pending')).toBe(false);
      expect(isKYCRejectedOrExpired('in_progress')).toBe(false);
      expect(isKYCRejectedOrExpired('verified')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(isKYCRejectedOrExpired(null)).toBe(false);
      expect(isKYCRejectedOrExpired(undefined)).toBe(false);
    });
  });

  describe('canInitiateKYC', () => {
    it('should return true when status is not_started', () => {
      expect(canInitiateKYC('not_started')).toBe(true);
    });

    it('should return true when status is rejected', () => {
      expect(canInitiateKYC('rejected')).toBe(true);
    });

    it('should return true when status is expired', () => {
      expect(canInitiateKYC('expired')).toBe(true);
    });

    it('should return false when status is pending', () => {
      expect(canInitiateKYC('pending')).toBe(false);
    });

    it('should return false when status is in_progress', () => {
      expect(canInitiateKYC('in_progress')).toBe(false);
    });

    it('should return false when status is verified', () => {
      expect(canInitiateKYC('verified')).toBe(false);
    });

    it('should return false for null and undefined', () => {
      expect(canInitiateKYC(null)).toBe(false);
      expect(canInitiateKYC(undefined)).toBe(false);
    });
  });

  describe('isKYCExpiringSoon', () => {
    it('should return false when expiresAt is null', () => {
      expect(isKYCExpiringSoon(null)).toBe(false);
    });

    it('should return false when expiresAt is undefined', () => {
      expect(isKYCExpiringSoon(undefined)).toBe(false);
    });

    it('should return false when expiresAt is empty string', () => {
      expect(isKYCExpiringSoon('')).toBe(false);
    });

    it('should return true when expiring in 30 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      expect(isKYCExpiringSoon(futureDate.toISOString())).toBe(true);
    });

    it('should return true when expiring in 1 day', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      expect(isKYCExpiringSoon(futureDate.toISOString())).toBe(true);
    });

    it('should return false when expiring in 31 days', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 31);
      expect(isKYCExpiringSoon(futureDate.toISOString())).toBe(false);
    });

    it('should return true when expiring today', () => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      expect(isKYCExpiringSoon(today.toISOString())).toBe(true);
    });

    it('should return false when already expired', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(isKYCExpiringSoon(pastDate.toISOString())).toBe(false);
    });
  });

  describe('getKYCStatusErrorMessage', () => {
    it('should return correct message for rejected status', () => {
      expect(getKYCStatusErrorMessage('rejected')).toBe(
        'Your KYC verification was rejected. Please try again or contact support.'
      );
    });

    it('should return correct message for expired status', () => {
      expect(getKYCStatusErrorMessage('expired')).toBe(
        'Your KYC verification has expired. Please renew it to continue.'
      );
    });

    it('should return correct message for not_started status', () => {
      expect(getKYCStatusErrorMessage('not_started')).toBe(
        'You have not started KYC verification yet.'
      );
    });

    it('should return unknown message for unhandled statuses', () => {
      expect(getKYCStatusErrorMessage('pending')).toBe('Unknown KYC status.');
      expect(getKYCStatusErrorMessage('in_progress')).toBe('Unknown KYC status.');
      expect(getKYCStatusErrorMessage('verified')).toBe('Unknown KYC status.');
    });
  });

  describe('KYCStatusEnum', () => {
    it('should accept valid status values', () => {
      expect(KYCStatusEnum.parse('not_started')).toBe('not_started');
      expect(KYCStatusEnum.parse('pending')).toBe('pending');
      expect(KYCStatusEnum.parse('in_progress')).toBe('in_progress');
      expect(KYCStatusEnum.parse('verified')).toBe('verified');
      expect(KYCStatusEnum.parse('rejected')).toBe('rejected');
      expect(KYCStatusEnum.parse('expired')).toBe('expired');
    });

    it('should reject invalid status values', () => {
      expect(() => KYCStatusEnum.parse('invalid')).toThrow();
      expect(() => KYCStatusEnum.parse('')).toThrow();
      expect(() => KYCStatusEnum.parse('VERIFIED')).toThrow();
    });
  });
});