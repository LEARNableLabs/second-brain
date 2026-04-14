import { describe, it, expect, afterEach } from 'vitest';
import { getDatabase, closeDatabase, getDatabasePath } from '../../src/db/connection.js';
import { migrate, getSchemaVersion } from '../../src/db/migrate.js';
import fs from 'fs';

describe('Database Connection', () => {
  afterEach(() => {
    // Clean up any open connections
    const dbPath = getDatabasePath();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  it('Test 1: getDatabase() creates data directory if missing and returns open DB connection', () => {
    const db = getDatabase();
    expect(db).toBeDefined();
    expect(getDatabasePath()).toContain('second-brain');
    expect(fs.existsSync(getDatabasePath())).toBe(true);
    closeDatabase(db);
  });

  it('Test 2: getDatabase() enables WAL journal mode', () => {
    const db = getDatabase();
    const result = db.pragma('journal_mode', { simple: true });
    expect(result).toBe('wal');
    closeDatabase(db);
  });

  it('Test 3: migrate() applies all migrations and sets user_version', () => {
    const db = getDatabase();
    const result = migrate(db);
    expect(result.applied).toBe(2);
    expect(result.current).toBe(2);
    expect(getSchemaVersion(db)).toBe(2);
    closeDatabase(db);
  });

  it('Test 4: migrate() skips already-applied migrations (idempotent)', () => {
    const db = getDatabase();
    migrate(db);
    const secondRun = migrate(db);
    expect(secondRun.applied).toBe(0);
    expect(secondRun.current).toBe(2);
    closeDatabase(db);
  });

  it('Test 5: getDatabase() rejects path traversal in SECOND_BRAIN_DATA_DIR', () => {
    const originalEnv = process.env.SECOND_BRAIN_DATA_DIR;
    try {
      process.env.SECOND_BRAIN_DATA_DIR = '/etc/passwd';
      expect(() => getDatabase()).toThrow(/Invalid SECOND_BRAIN_DATA_DIR/);
    } finally {
      process.env.SECOND_BRAIN_DATA_DIR = originalEnv;
    }
  });
});
