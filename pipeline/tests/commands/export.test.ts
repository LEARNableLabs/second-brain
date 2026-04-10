import { describe, it, expect, beforeEach } from 'vitest';
import { exportCommand } from '../../src/commands/export.js';
import { getDatabase, closeDatabase } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { getCaptureStats } from '../../src/db/operations.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('exportCommand', () => {
  let exportPath: string;

  beforeEach(() => {
    // Setup export.json path for tests
    const dataDir = process.env.SECOND_BRAIN_DATA_DIR || path.join(os.homedir(), '.second-brain');
    exportPath = path.join(dataDir, 'export.json');
  });

  it('saves mock captures to database and returns summary stats', async () => {
    // Write test export.json
    const testData = {
      captures: {
        '2026-04-10': [
          {
            url: 'https://example.com',
            title: 'Example Page',
            domain: 'example.com',
            timestamp: 1712764800000,
            source: 'live',
          },
          {
            url: 'https://test.com',
            title: 'Test Page',
            domain: 'test.com',
            timestamp: 1712764900000,
            source: 'backfill',
          },
        ],
      },
      exportedAt: 1712764800000,
    };
    fs.writeFileSync(exportPath, JSON.stringify(testData));

    await exportCommand();

    // Verify database has entries
    const db = getDatabase();
    try {
      const stats = getCaptureStats(db);
      expect(stats.total).toBe(2);
      expect(stats.byStatus['captured']).toBe(2);
    } finally {
      closeDatabase(db);
    }
  });

  it('validates entries with Zod and skips invalid ones', async () => {
    // Include one invalid entry (missing url field)
    const testData = {
      captures: {
        '2026-04-10': [
          {
            url: 'https://valid.com',
            title: 'Valid Page',
            domain: 'valid.com',
            timestamp: 1712764800000,
            source: 'live',
          },
          {
            // Invalid: missing url
            title: 'Invalid Page',
            domain: 'invalid.com',
            timestamp: 1712764900000,
            source: 'live',
          },
        ],
      },
      exportedAt: 1712764800000,
    };
    fs.writeFileSync(exportPath, JSON.stringify(testData));

    await exportCommand();

    // Should only save the valid entry
    const db = getDatabase();
    try {
      const stats = getCaptureStats(db);
      expect(stats.total).toBe(1);
    } finally {
      closeDatabase(db);
    }
  });

  it('deduplicates URL+date pairs', async () => {
    // First export
    const testData = {
      captures: {
        '2026-04-10': [
          {
            url: 'https://example.com',
            title: 'Example Page',
            domain: 'example.com',
            timestamp: 1712764800000,
            source: 'live',
          },
        ],
      },
      exportedAt: 1712764800000,
    };
    fs.writeFileSync(exportPath, JSON.stringify(testData));
    await exportCommand();

    // Second export with same URL+date
    fs.writeFileSync(exportPath, JSON.stringify(testData));
    await exportCommand();

    // Should still only have one entry
    const db = getDatabase();
    try {
      const stats = getCaptureStats(db);
      expect(stats.total).toBe(1);
    } finally {
      closeDatabase(db);
    }
  });

  it('counts manual saves separately in output', async () => {
    const testData = {
      captures: {
        '2026-04-10': [
          {
            url: 'https://live.com',
            title: 'Live Page',
            domain: 'live.com',
            timestamp: 1712764800000,
            source: 'live',
          },
          {
            url: 'https://manual.com',
            title: 'Manual Save',
            domain: 'manual.com',
            timestamp: 1712764900000,
            source: 'manual',
          },
        ],
      },
      exportedAt: 1712764800000,
    };
    fs.writeFileSync(exportPath, JSON.stringify(testData));

    await exportCommand();

    // Verify database has both entries with correct sources
    const db = getDatabase();
    try {
      const stats = getCaptureStats(db);
      expect(stats.total).toBe(2);
      expect(stats.bySource['manual']).toBe(1);
      expect(stats.bySource['live']).toBe(1);
    } finally {
      closeDatabase(db);
    }
  });

  it('outputs database path', async () => {
    const testData = {
      captures: {
        '2026-04-10': [
          {
            url: 'https://example.com',
            title: 'Example',
            domain: 'example.com',
            timestamp: 1712764800000,
            source: 'live',
          },
        ],
      },
      exportedAt: 1712764800000,
    };
    fs.writeFileSync(exportPath, JSON.stringify(testData));

    // Capture console output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => logs.push(args.join(' '));

    try {
      await exportCommand();
      const output = logs.join('\n');
      expect(output).toContain('Database:');
      expect(output).toContain('data.db');
    } finally {
      console.log = originalLog;
    }
  });

  it('outputs schema version number', async () => {
    const testData = {
      captures: {
        '2026-04-10': [
          {
            url: 'https://example.com',
            title: 'Example',
            domain: 'example.com',
            timestamp: 1712764800000,
            source: 'live',
          },
        ],
      },
      exportedAt: 1712764800000,
    };
    fs.writeFileSync(exportPath, JSON.stringify(testData));

    // Capture console output
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => logs.push(args.join(' '));

    try {
      await exportCommand();
      const output = logs.join('\n');
      expect(output).toMatch(/Schema: v\d+/);
    } finally {
      console.log = originalLog;
    }
  });

  it('handles empty captures gracefully', async () => {
    // No export.json file
    if (fs.existsSync(exportPath)) {
      fs.unlinkSync(exportPath);
    }

    // Capture console output
    const logs: string[] = [];
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: any[]) => logs.push(args.join(' '));
    console.error = (...args: any[]) => logs.push(args.join(' '));

    try {
      await exportCommand();
      const output = logs.join('\n');
      expect(output).toContain('No export file found');
    } finally {
      console.log = originalLog;
      console.error = originalError;
    }
  });
});
