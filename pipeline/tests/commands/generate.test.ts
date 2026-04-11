import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateCommand } from '../../src/commands/generate.js';
import { getDatabase, closeDatabase } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { saveCaptures, getByDate } from '../../src/db/operations.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mock meta-fetcher to avoid real HTTP calls
vi.mock('../../src/generators/meta-fetcher.js', () => ({
  fetchAllDescriptions: vi.fn().mockResolvedValue(new Map()),
}));

// Mock git operations to avoid real git in tests
vi.mock('../../src/git/auto-commit.js', () => ({
  ensureGitRepo: vi.fn().mockResolvedValue(undefined),
  autoCommitNotes: vi.fn().mockResolvedValue(true),
}));

describe('generateCommand', () => {
  let outputDir: string;

  beforeEach(() => {
    // Create output dir inside the test temp dir
    const dataDir = process.env.SECOND_BRAIN_DATA_DIR!;
    outputDir = path.join(dataDir, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    // Set config to use test output dir
    const configPath = path.join(dataDir, 'config.json');
    fs.writeFileSync(configPath, JSON.stringify({ outputDir }));

    // Seed database with test captures
    const db = getDatabase();
    migrate(db);
    saveCaptures(db, [
      {
        url: 'https://example.com/article',
        title: 'Example Article',
        domain: 'example.com',
        timestamp: 1712764800000, // 2024-04-10
        source: 'live',
      },
      {
        url: 'https://arxiv.org/paper',
        title: 'Research Paper',
        domain: 'arxiv.org',
        timestamp: 1712768400000,
        source: 'manual',
      },
    ]);
    closeDatabase(db);
  });

  it('outputs markdown to stdout in dry mode', async () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: any[]) => logs.push(args.join(' '));
    const origErr = console.error;
    console.error = () => {};

    try {
      await generateCommand({ date: '2024-04-10', dry: true });
      const output = logs.join('\n');
      expect(output).toContain('## Highlights');
      expect(output).toContain('## Browsing Log');
      expect(output).toContain('Example Article');
    } finally {
      console.log = origLog;
      console.error = origErr;
    }
  });

  it('writes YYYY-MM-DD.md file to output directory', async () => {
    const origErr = console.error;
    console.error = () => {};

    try {
      await generateCommand({ date: '2024-04-10' });
      const filePath = path.join(outputDir, '2024-04-10.md');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toContain('---'); // YAML frontmatter
      expect(content).toContain('## Browsing Log');
      expect(content).toContain('Example Article');
    } finally {
      console.error = origErr;
    }
  });

  it('produces identical output when called twice (regeneration idempotency)', async () => {
    const origErr = console.error;
    console.error = () => {};

    try {
      await generateCommand({ date: '2024-04-10' });
      const filePath = path.join(outputDir, '2024-04-10.md');
      const first = fs.readFileSync(filePath, 'utf-8');

      await generateCommand({ date: '2024-04-10' });
      const second = fs.readFileSync(filePath, 'utf-8');

      expect(first).toBe(second);
    } finally {
      console.error = origErr;
    }
  });

  it('creates no file when no captures exist for date', async () => {
    const logs: string[] = [];
    const origErr = console.error;
    console.error = (...args: any[]) => logs.push(args.join(' '));

    try {
      await generateCommand({ date: '2099-01-01' });
      const filePath = path.join(outputDir, '2099-01-01.md');
      expect(fs.existsSync(filePath)).toBe(false);
      expect(logs.join('\n')).toContain('No captures found');
    } finally {
      console.error = origErr;
    }
  });

  it('updates capture status to written after successful write', async () => {
    const origErr = console.error;
    console.error = () => {};

    try {
      await generateCommand({ date: '2024-04-10' });

      const db = getDatabase();
      try {
        const rows = getByDate(db, '2024-04-10');
        for (const row of rows) {
          expect(row.status).toBe('written');
        }
      } finally {
        closeDatabase(db);
      }
    } finally {
      console.error = origErr;
    }
  });
});
