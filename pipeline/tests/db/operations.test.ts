import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, closeDatabase } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { saveCaptures, updateStatus, getByStatus } from '../../src/db/operations.js';
import type { CaptureEntry } from '@second-brain/shared';
import Database from 'better-sqlite3';

describe('Database Operations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase();
    migrate(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  it('Test 5: saveCaptures() inserts new entries with status = captured', () => {
    const entries: CaptureEntry[] = [{
      url: 'https://example.com',
      title: 'Example',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'live',
    }];

    const result = saveCaptures(db, entries);
    expect(result.inserted).toBe(1);
    expect(result.skipped).toBe(0);

    const captured = getByStatus(db, 'captured');
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('https://example.com');
    expect(captured[0].status).toBe('captured');
  });

  it('Test 6: saveCaptures() skips duplicate (url, date) pairs', () => {
    const timestamp = new Date('2026-04-10T12:00:00Z').getTime();
    const entry: CaptureEntry = {
      url: 'https://example.com',
      title: 'Example',
      domain: 'example.com',
      timestamp,
      source: 'live',
    };

    const first = saveCaptures(db, [entry]);
    expect(first.inserted).toBe(1);

    const second = saveCaptures(db, [entry]);
    expect(second.inserted).toBe(0);
    expect(second.skipped).toBe(1);

    const all = getByStatus(db, 'captured');
    expect(all).toHaveLength(1);
  });

  it('Test 7: saveCaptures() handles source field correctly', () => {
    const entries: CaptureEntry[] = [
      { url: 'https://live.com', title: 'Live', domain: 'live.com', timestamp: Date.now(), source: 'live' },
      { url: 'https://backfill.com', title: 'Backfill', domain: 'backfill.com', timestamp: Date.now(), source: 'backfill' },
      { url: 'https://manual.com', title: 'Manual', domain: 'manual.com', timestamp: Date.now(), source: 'manual' },
    ];

    const result = saveCaptures(db, entries);
    expect(result.inserted).toBe(3);

    const all = getByStatus(db, 'captured');
    expect(all).toHaveLength(3);
    expect(all.find(r => r.url === 'https://live.com')?.source).toBe('live');
    expect(all.find(r => r.url === 'https://backfill.com')?.source).toBe('backfill');
    expect(all.find(r => r.url === 'https://manual.com')?.source).toBe('manual');
  });

  it('Test 8: updateStatus() changes status from captured to content_fetched', () => {
    const timestamp = new Date('2026-04-10T12:00:00Z').getTime();
    const entry: CaptureEntry = {
      url: 'https://example.com',
      title: 'Example',
      domain: 'example.com',
      timestamp,
      source: 'live',
    };

    saveCaptures(db, [entry]);

    const updated = updateStatus(db, 'https://example.com', '2026-04-10', 'content_fetched');
    expect(updated).toBe(true);

    const captured = getByStatus(db, 'captured');
    expect(captured).toHaveLength(0);

    const fetched = getByStatus(db, 'content_fetched');
    expect(fetched).toHaveLength(1);
    expect(fetched[0].url).toBe('https://example.com');
  });

  it('Test 9: getByStatus() returns only rows with matching status', () => {
    const entries: CaptureEntry[] = [
      { url: 'https://one.com', title: 'One', domain: 'one.com', timestamp: Date.now(), source: 'live' },
      { url: 'https://two.com', title: 'Two', domain: 'two.com', timestamp: Date.now(), source: 'live' },
    ];

    saveCaptures(db, entries);
    updateStatus(db, 'https://one.com', new Date().toISOString().split('T')[0], 'curated');

    const captured = getByStatus(db, 'captured');
    expect(captured).toHaveLength(1);
    expect(captured[0].url).toBe('https://two.com');

    const curated = getByStatus(db, 'curated');
    expect(curated).toHaveLength(1);
    expect(curated[0].url).toBe('https://one.com');
  });

  it('Test 10: captures table has CHECK constraint on status column', () => {
    expect(() => {
      db.prepare('INSERT INTO captures (url, title, domain, timestamp, date, source, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('https://example.com', 'Example', 'example.com', Date.now(), '2026-04-10', 'live', 'invalid_status');
    }).toThrow();
  });

  it('Test 11: captures table has CHECK constraint on source column', () => {
    expect(() => {
      db.prepare('INSERT INTO captures (url, title, domain, timestamp, date, source, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run('https://example.com', 'Example', 'example.com', Date.now(), '2026-04-10', 'invalid_source', 'captured');
    }).toThrow();
  });
});
