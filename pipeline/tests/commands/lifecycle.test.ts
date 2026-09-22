import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { handleMessage } from '../../src/messaging/host.js';
import { generateCommand } from '../../src/commands/generate.js';
import { captureConversationCommand } from '../../src/commands/capture-conversation.js';
import { fetchCommand } from '../../src/commands/fetch.js';
import { getDatabase, closeDatabase } from '../../src/db/connection.js';
import { getByDate, updateStatus } from '../../src/db/operations.js';
import { getContentByDate } from '../../src/db/content-operations.js';
import { localDate } from '../../src/config/date.js';
import { exportCommand } from '../../src/commands/export.js';
import { curateCommand } from '../../src/commands/curate.js';

vi.mock('../../src/generators/meta-fetcher.js', () => ({ fetchAllDescriptions: vi.fn(async () => new Map()) }));
vi.mock('../../src/git/auto-commit.js', () => ({ ensureGitRepo: vi.fn(), autoCommitNotes: vi.fn() }));
vi.mock('../../src/extractors/strategy.js', () => ({ extractContent: vi.fn(() => { throw new Error('Unexpected fetch'); }) }));
vi.mock('../../src/ai/provider.js', () => ({ createProvider: () => ({ complete: async () => '## Highlights\n\nA useful [[Test topic]] conversation.' }) }));

let outputDir: string;
beforeEach(() => {
  outputDir = path.join(process.env.SECOND_BRAIN_DATA_DIR!, 'notes');
  fs.mkdirSync(outputDir);
  fs.writeFileSync(path.join(process.env.SECOND_BRAIN_DATA_DIR!, 'config.json'), JSON.stringify({ outputDir }));
});

describe('pipeline lifecycle', () => {
  it('curates a conversation and cleans ephemeral content after the final note is saved', async () => {
    const date = localDate();
    await captureConversationCommand({ topic: 'Test topic', summary: 'An important conversation.' });
    await curateCommand({ date, eod: true });
    const note = fs.readFileSync(path.join(outputDir, `${date}.md`), 'utf8');
    expect(note).toContain('A useful [[Test topic]] conversation.');
    const db = getDatabase();
    try {
      expect(getByDate(db, date)[0].status).toBe('curated');
      expect(getContentByDate(db, date)).toEqual([]);
    } finally { closeDatabase(db); }
  });
  it('preserves highlights and processing status across hourly generation', async () => {
    const date = localDate();
    handleMessage({ action: 'syncCaptures', exportedAt: Date.now(), captures: { [date]: [{ url: 'https://example.com', title: 'Example', domain: 'example.com', timestamp: Date.now(), source: 'live' }] } });
    const db = getDatabase();
    updateStatus(db, 'https://example.com', date, 'curated');
    closeDatabase(db);
    const note = path.join(outputDir, `${date}.md`);
    fs.writeFileSync(note, '---\ndate: test\n---\n\n## Highlights\n\nKeep this summary.\n\n## Topic Clusters\n\nKeep these too.\n\n## Browsing Log\n\nOld log.');
    await generateCommand({ date });
    const result = fs.readFileSync(note, 'utf8');
    expect(result).toContain('Keep this summary.');
    expect(result).toContain('Keep these too.');
    expect(result).toContain('[Example]');
    const check = getDatabase();
    try { expect(getByDate(check, date)[0].status).toBe('curated'); }
    finally { closeDatabase(check); }
  });

  it('keeps conversation summaries through generate and fetch', async () => {
    const date = localDate();
    await captureConversationCommand({ topic: 'Test topic', summary: 'An important conversation.' });
    await generateCommand({ date });
    await fetchCommand({ date });
    const db = getDatabase();
    try {
      expect(getByDate(db, date)[0].status).toBe('content_fetched');
      expect(getContentByDate(db, date)[0].body).toBe('An important conversation.');
    } finally { closeDatabase(db); }
  });

  it('preserves export snapshots during previews and successful imports', async () => {
    const file = path.join(process.env.SECOND_BRAIN_DATA_DIR!, 'export.json');
    const raw = JSON.stringify({ captures: { today: [{ url: 'https://example.com', title: 'Example', domain: 'example.com', timestamp: Date.now(), source: 'live' }] } });
    fs.writeFileSync(file, raw);
    await exportCommand({ dryRun: true });
    expect(fs.readFileSync(file, 'utf8')).toBe(raw);
    const before = getDatabase();
    expect(getByDate(before, localDate())).toHaveLength(0);
    closeDatabase(before);
    await exportCommand();
    expect(fs.readFileSync(file, 'utf8')).toBe(raw);
    const after = getDatabase();
    expect(getByDate(after, localDate())).toHaveLength(1);
    closeDatabase(after);
  });
});
