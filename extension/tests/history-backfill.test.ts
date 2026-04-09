import { describe, it, expect } from 'vitest';
import { BACKFILL_MAX_LOOKBACK_DAYS, BACKFILL_MAX_RESULTS } from '../components/types';
import { detectGap, backfillHistory } from '../components/history-backfill';

describe('BACKFILL_MAX_LOOKBACK_DAYS constant', () => {
  it('equals 7 days (D-14)', () => {
    expect(BACKFILL_MAX_LOOKBACK_DAYS).toBe(7);
  });
});

describe('BACKFILL_MAX_RESULTS constant', () => {
  it('equals 1000 results', () => {
    expect(BACKFILL_MAX_RESULTS).toBe(1000);
  });
});

describe('history-backfill exports', () => {
  it('exports detectGap function', () => {
    expect(typeof detectGap).toBe('function');
  });

  it('exports backfillHistory function', () => {
    expect(typeof backfillHistory).toBe('function');
  });
});

describe('history-backfill stubs', () => {
  it('detectGap returns object with hasGap, gapStart, gapEnd', async () => {
    const result = await detectGap();

    expect(result).toHaveProperty('hasGap');
    expect(result).toHaveProperty('gapStart');
    expect(result).toHaveProperty('gapEnd');
    expect(typeof result.hasGap).toBe('boolean');
    expect(typeof result.gapStart).toBe('number');
    expect(typeof result.gapEnd).toBe('number');
  });

  it('backfillHistory accepts gapStart and gapEnd, returns count', async () => {
    const now = Date.now();
    const result = await backfillHistory(now - 3600000, now);

    expect(typeof result).toBe('number');
  });
});
