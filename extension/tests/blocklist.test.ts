import { describe, it, expect } from 'vitest';
import { isBlocked, flattenBlocklist } from '../components/blocklist';
import { BlocklistConfig } from '../components/types';

describe('isBlocked', () => {
  it('returns true for exact domain match', () => {
    const blocklist = ['google.com', 'facebook.com'];
    expect(isBlocked('google.com', blocklist)).toBe(true);
  });

  it('returns true for subdomain match (D-07)', () => {
    const blocklist = ['google.com'];
    expect(isBlocked('mail.google.com', blocklist)).toBe(true);
    expect(isBlocked('docs.google.com', blocklist)).toBe(true);
    expect(isBlocked('drive.google.com', blocklist)).toBe(true);
  });

  it('returns false for non-matching domain', () => {
    const blocklist = ['google.com'];
    expect(isBlocked('example.com', blocklist)).toBe(false);
    expect(isBlocked('yahoo.com', blocklist)).toBe(false);
  });

  it('returns false for partial string match that is not a subdomain', () => {
    const blocklist = ['google.com'];
    // "notgoogle.com" should NOT match "google.com"
    expect(isBlocked('notgoogle.com', blocklist)).toBe(false);
    expect(isBlocked('mygoogle.com', blocklist)).toBe(false);
  });

  it('returns false for empty blocklist', () => {
    expect(isBlocked('google.com', [])).toBe(false);
  });

  it('is case-insensitive', () => {
    const blocklist = ['google.com'];
    expect(isBlocked('Google.com', blocklist)).toBe(true);
    expect(isBlocked('MAIL.GOOGLE.COM', blocklist)).toBe(true);
  });

  it('handles blocklist patterns with different cases', () => {
    const blocklist = ['Google.COM', 'Facebook.com'];
    expect(isBlocked('google.com', blocklist)).toBe(true);
    expect(isBlocked('mail.google.com', blocklist)).toBe(true);
  });
});

describe('flattenBlocklist', () => {
  it('merges all categories into flat array', () => {
    const config: BlocklistConfig = {
      google: ['google.com', 'gmail.com'],
      banking: ['chase.com', 'paypal.com'],
      social: ['twitter.com', 'facebook.com'],
      auth: ['localhost', 'auth0.com'],
      custom: ['example.com'],
    };

    const flattened = flattenBlocklist(config);

    expect(flattened).toHaveLength(9);
    expect(flattened).toContain('google.com');
    expect(flattened).toContain('gmail.com');
    expect(flattened).toContain('chase.com');
    expect(flattened).toContain('paypal.com');
    expect(flattened).toContain('twitter.com');
    expect(flattened).toContain('facebook.com');
    expect(flattened).toContain('localhost');
    expect(flattened).toContain('auth0.com');
    expect(flattened).toContain('example.com');
  });

  it('includes custom entries', () => {
    const config: BlocklistConfig = {
      google: [],
      banking: [],
      social: [],
      auth: [],
      custom: ['custom1.com', 'custom2.com'],
    };

    const flattened = flattenBlocklist(config);

    expect(flattened).toHaveLength(2);
    expect(flattened).toContain('custom1.com');
    expect(flattened).toContain('custom2.com');
  });

  it('handles empty config', () => {
    const config: BlocklistConfig = {
      google: [],
      banking: [],
      social: [],
      auth: [],
      custom: [],
    };

    const flattened = flattenBlocklist(config);
    expect(flattened).toHaveLength(0);
  });
});
