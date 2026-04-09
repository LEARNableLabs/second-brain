import { describe, it, expect } from 'vitest';
import { DWELL_THRESHOLD_MS } from '../components/types';
import { startTracking, cancelTracking, checkDwell } from '../components/dwell-tracker';

describe('DWELL_THRESHOLD_MS constant', () => {
  it('equals 5000 milliseconds (D-04)', () => {
    expect(DWELL_THRESHOLD_MS).toBe(5000);
  });
});

describe('dwell-tracker exports', () => {
  it('exports startTracking function', () => {
    expect(typeof startTracking).toBe('function');
  });

  it('exports cancelTracking function', () => {
    expect(typeof cancelTracking).toBe('function');
  });

  it('exports checkDwell function', () => {
    expect(typeof checkDwell).toBe('function');
  });
});

describe('dwell-tracker stubs', () => {
  it('startTracking accepts tabId, url, and title', async () => {
    // Stub should not throw
    await expect(startTracking(123, 'https://example.com', 'Example')).resolves.toBeUndefined();
  });

  it('cancelTracking accepts tabId', async () => {
    // Stub should not throw
    await expect(cancelTracking(123)).resolves.toBeUndefined();
  });

  it('checkDwell accepts tabId and returns boolean', async () => {
    // Stub returns false
    const result = await checkDwell(123);
    expect(typeof result).toBe('boolean');
  });
});
