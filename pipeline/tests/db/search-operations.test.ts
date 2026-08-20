import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getDatabase, closeDatabase } from '../../src/db/connection.js';
import { migrate } from '../../src/db/migrate.js';
import { saveCaptures } from '../../src/db/operations.js';
import { searchCaptures } from '../../src/db/search-operations.js';
import type { CaptureEntry } from '@second-brain/shared';
import Database from 'better-sqlite3';

describe('Search Operations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase();
    migrate(db);
  });

  afterEach(() => {
    closeDatabase(db);
  });

  function insertTestCaptures(entries: Partial<CaptureEntry>[]) {
    const full: CaptureEntry[] = entries.map((e, i) => ({
      url: e.url || `https://example.com/${i}`,
      title: e.title || `Title ${i}`,
      domain: e.domain || 'example.com',
      timestamp: e.timestamp || new Date('2026-04-10T12:00:00Z').getTime() + i * 1000,
      source: e.source || 'live',
    }));
    saveCaptures(db, full);
  }

  it('migration creates FTS5 table', () => {
    const version = db.pragma('user_version', { simple: true });
    expect(version).toBe(3);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='captures_fts'"
    ).all();
    expect(tables).toHaveLength(1);
  });

  it('finds captures by title', () => {
    insertTestCaptures([
      { title: 'Reinforcement Learning: An Introduction', url: 'https://arxiv.org/1' },
      { title: 'Cooking Recipes for Pasta', url: 'https://food.com/1' },
    ]);

    const results = searchCaptures(db, 'reinforcement');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Reinforcement Learning: An Introduction');
  });

  it('finds captures by domain', () => {
    insertTestCaptures([
      { title: 'Paper One', domain: 'arxiv.org', url: 'https://arxiv.org/1' },
      { title: 'Blog Post', domain: 'blog.com', url: 'https://blog.com/1' },
    ]);

    const results = searchCaptures(db, 'arxiv.org');
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe('arxiv.org');
  });

  it('returns empty array for no matches', () => {
    insertTestCaptures([{ title: 'Something Else', url: 'https://example.com/1' }]);
    const results = searchCaptures(db, 'nonexistent');
    expect(results).toHaveLength(0);
  });

  it('respects limit option', () => {
    insertTestCaptures([
      { title: 'Machine Learning A', url: 'https://ml.com/a' },
      { title: 'Machine Learning B', url: 'https://ml.com/b' },
      { title: 'Machine Learning C', url: 'https://ml.com/c' },
    ]);

    const results = searchCaptures(db, 'machine', { limit: 2 });
    expect(results).toHaveLength(2);
  });

  it('filters by domain option', () => {
    insertTestCaptures([
      { title: 'ML Paper', domain: 'arxiv.org', url: 'https://arxiv.org/2' },
      { title: 'ML Blog', domain: 'medium.com', url: 'https://medium.com/2' },
    ]);

    const results = searchCaptures(db, 'ML', { domain: 'arxiv.org' });
    expect(results).toHaveLength(1);
    expect(results[0].domain).toBe('arxiv.org');
  });

  it('filters by date range', () => {
    const entries: CaptureEntry[] = [
      { url: 'https://a.com/1', title: 'Old ML Post', domain: 'a.com', timestamp: new Date('2026-01-01T12:00:00Z').getTime(), source: 'live' },
      { url: 'https://b.com/1', title: 'New ML Post', domain: 'b.com', timestamp: new Date('2026-06-15T12:00:00Z').getTime(), source: 'live' },
    ];
    saveCaptures(db, entries);

    const results = searchCaptures(db, 'ML', { from: '2026-06-01' });
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('New ML Post');

    const results2 = searchCaptures(db, 'ML', { to: '2026-03-01' });
    expect(results2).toHaveLength(1);
    expect(results2[0].title).toBe('Old ML Post');
  });

  it('handles FTS5 special characters gracefully', () => {
    insertTestCaptures([{ title: 'Normal Title', url: 'https://example.com/1' }]);
    const results = searchCaptures(db, 'query OR AND NOT *');
    expect(Array.isArray(results)).toBe(true);
  });

  it('indexes new inserts via trigger', () => {
    const results1 = searchCaptures(db, 'transformers');
    expect(results1).toHaveLength(0);

    insertTestCaptures([{ title: 'Attention Is All You Need: Transformers', url: 'https://arxiv.org/3' }]);

    const results2 = searchCaptures(db, 'transformers');
    expect(results2).toHaveLength(1);
  });

  it('returns snippet field', () => {
    insertTestCaptures([{ title: 'Deep Reinforcement Learning with Double Q-Learning', url: 'https://arxiv.org/4' }]);

    const results = searchCaptures(db, 'reinforcement');
    expect(results).toHaveLength(1);
    expect(results[0].snippet).toBeDefined();
    expect(results[0].snippet.length).toBeGreaterThan(0);
  });
});
