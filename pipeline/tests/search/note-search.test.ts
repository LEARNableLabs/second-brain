import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { searchNotes, extractSnippets } from '../../src/search/note-search.js';
import fs from 'fs';
import os from 'os';
import path from 'path';

describe('Note Search', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = path.join(os.tmpdir(), 'note-search-test-' + process.pid);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  function writeNote(date: string, content: string) {
    fs.writeFileSync(path.join(testDir, `${date}.md`), content);
  }

  it('finds notes containing the query', async () => {
    writeNote('2026-04-10', '## Highlights\n\nExplored reinforcement learning papers today.');
    writeNote('2026-04-11', '## Highlights\n\nWorked on cooking recipes.');

    const results = await searchNotes(testDir, 'reinforcement');
    expect(results).toHaveLength(1);
    expect(results[0].date).toBe('2026-04-10');
  });

  it('case-insensitive matching', async () => {
    writeNote('2026-04-10', 'Topic: MACHINE LEARNING advances');

    const results = await searchNotes(testDir, 'machine learning');
    expect(results).toHaveLength(1);
  });

  it('returns most recent first', async () => {
    writeNote('2026-04-08', 'ML content here');
    writeNote('2026-04-10', 'ML content here');
    writeNote('2026-04-09', 'ML content here');

    const results = await searchNotes(testDir, 'ML');
    expect(results).toHaveLength(3);
    expect(results[0].date).toBe('2026-04-10');
    expect(results[1].date).toBe('2026-04-09');
    expect(results[2].date).toBe('2026-04-08');
  });

  it('filters by date range', async () => {
    writeNote('2026-01-01', 'ML content');
    writeNote('2026-06-15', 'ML content');

    const results = await searchNotes(testDir, 'ML', { from: '2026-06-01' });
    expect(results).toHaveLength(1);
    expect(results[0].date).toBe('2026-06-15');
  });

  it('respects limit', async () => {
    writeNote('2026-04-08', 'ML content');
    writeNote('2026-04-09', 'ML content');
    writeNote('2026-04-10', 'ML content');

    const results = await searchNotes(testDir, 'ML', { limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('skips non-date-named files', async () => {
    writeNote('2026-04-10', 'ML content');
    fs.writeFileSync(path.join(testDir, 'Resources.md'), 'ML content');

    const results = await searchNotes(testDir, 'ML');
    expect(results).toHaveLength(1);
    expect(results[0].date).toBe('2026-04-10');
  });

  it('returns empty for missing directory', async () => {
    const results = await searchNotes('/nonexistent/path', 'query');
    expect(results).toHaveLength(0);
  });

  it('returns empty when no matches', async () => {
    writeNote('2026-04-10', 'Nothing relevant here');

    const results = await searchNotes(testDir, 'quantum physics');
    expect(results).toHaveLength(0);
  });

  it('includes filepath in results', async () => {
    writeNote('2026-04-10', 'Some ML discussion');

    const results = await searchNotes(testDir, 'ML');
    expect(results[0].filepath).toBe(path.join(testDir, '2026-04-10.md'));
  });
});

describe('extractSnippets', () => {
  it('extracts snippet with context around match', () => {
    const content = 'This is some text about reinforcement learning and its applications in robotics.';
    const snippets = extractSnippets(content, 'reinforcement', 3);
    expect(snippets).toHaveLength(1);
    expect(snippets[0]).toContain('>>>');
    expect(snippets[0]).toContain('<<<');
  });

  it('limits number of snippets', () => {
    const content = 'ML is great. ML is wonderful. ML is everywhere. ML is the future.';
    const snippets = extractSnippets(content, 'ml', 2);
    expect(snippets).toHaveLength(2);
  });

  it('handles match at start of content', () => {
    const content = 'Reinforcement learning is a branch of ML.';
    const snippets = extractSnippets(content, 'reinforcement', 1);
    expect(snippets).toHaveLength(1);
    expect(snippets[0].startsWith('...')).toBe(false);
  });

  it('handles match at end of content', () => {
    const content = 'A branch of reinforcement';
    const snippets = extractSnippets(content, 'reinforcement', 1);
    expect(snippets).toHaveLength(1);
    expect(snippets[0].endsWith('...')).toBe(false);
  });
});
