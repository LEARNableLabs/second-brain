import { describe, expect, it } from 'vitest';
import { handleMessage } from '../../src/messaging/host.js';
import { closeDatabase, getDatabase } from '../../src/db/connection.js';
import { getCaptureStats, getByDate } from '../../src/db/operations.js';
import { localDate } from '../../src/config/date.js';

describe('native host persistence', () => {
  it('persists and deduplicates before acknowledging, including manual upgrades', () => {
    const entry = { url: 'https://example.com', title: 'Example', domain: 'example.com', timestamp: Date.now(), source: 'live' };
    const msg = { action: 'syncCaptures' as const, captures: { today: [entry] }, exportedAt: Date.now() };
    expect(handleMessage(msg)).toMatchObject({ success: true, received: 1, inserted: 1 });
    entry.source = 'manual';
    expect(handleMessage(msg)).toMatchObject({ success: true, inserted: 0 });
    const db = getDatabase();
    try {
      expect(getCaptureStats(db).total).toBe(1);
      expect(getByDate(db, localDate())[0].source).toBe('manual');
    } finally { closeDatabase(db); }
  });

  it('rejects a malformed batch without acknowledging success', () => {
    expect(handleMessage({ action: 'syncCaptures', captures: { today: [{}] }, exportedAt: Date.now() })).toHaveProperty('error');
    expect(handleMessage(null as any)).toHaveProperty('error');
  });
});
