import { describe, expect, it } from 'vitest';
import { localDate, parseDate } from '../../src/config/date.js';

describe('calendar dates', () => {
  it('uses local calendar fields, including late evening', () => {
    expect(localDate(new Date(2026, 8, 22, 23, 59))).toBe('2026-09-22');
  });
  it('accepts leap days and rejects impossible dates and paths', () => {
    expect(parseDate('2024-02-29')).toBe('2024-02-29');
    for (const value of ['2026-02-29', '2026-13-01', '../notes', '2026-9-2', '2026-04-31']) {
      expect(() => parseDate(value)).toThrow();
    }
  });
});
