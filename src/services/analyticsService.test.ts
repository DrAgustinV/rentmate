import { describe, it, expect } from 'vitest';
import { anonymizeIP } from '../services/analyticsService';

describe('anonymizeIP', () => {
  it('should anonymize a standard IPv4 address by zeroing last octet', () => {
    expect(anonymizeIP('192.168.1.100')).toBe('192.168.1.0');
    expect(anonymizeIP('10.0.0.255')).toBe('10.0.0.0');
    expect(anonymizeIP('172.16.50.123')).toBe('172.16.50.0');
  });

  it('should return original IP if not a valid IPv4 format', () => {
    expect(anonymizeIP('invalid')).toBe('invalid');
    expect(anonymizeIP('')).toBe('');
    expect(anonymizeIP('192.168.1')).toBe('192.168.1');
  });

  it('should handle edge cases', () => {
    expect(anonymizeIP('0.0.0.0')).toBe('0.0.0.0');
    expect(anonymizeIP('255.255.255.255')).toBe('255.255.255.0');
    expect(anonymizeIP('127.0.0.1')).toBe('127.0.0.0');
  });

  it('should handle non-4-part IPs gracefully', () => {
    expect(anonymizeIP('192.168.1')).toBe('192.168.1');
    expect(anonymizeIP('192.168.1.100.50')).toBe('192.168.1.100.50');
  });
});