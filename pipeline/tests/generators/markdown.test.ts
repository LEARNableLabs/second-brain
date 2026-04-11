import { describe, it, expect } from 'vitest';
import { buildFrontmatter, renderFrontmatter } from '../../src/generators/frontmatter.js';
import { escapeMarkdown, formatEntry, groupByDomain, generateDailyNote } from '../../src/generators/markdown.js';
import type { CaptureRow } from '../../src/db/operations.js';

describe('frontmatter generation', () => {
  it('buildFrontmatter with 5 captures (3 live, 1 manual, 1 backfill) across 2 domains produces correct metadata', () => {
    const captures: CaptureRow[] = [
      {
        id: 1,
        url: 'https://example.com/page1',
        title: 'Example Page',
        domain: 'example.com',
        timestamp: 1712793600000,
        date: '2026-04-10',
        source: 'live',
        status: 'captured',
        created_at: 1712793600000,
      },
      {
        id: 2,
        url: 'https://example.com/page2',
        title: 'Another Example',
        domain: 'example.com',
        timestamp: 1712793700000,
        date: '2026-04-10',
        source: 'live',
        status: 'captured',
        created_at: 1712793700000,
      },
      {
        id: 3,
        url: 'https://arxiv.org/paper1',
        title: 'Research Paper',
        domain: 'arxiv.org',
        timestamp: 1712793800000,
        date: '2026-04-10',
        source: 'manual',
        status: 'captured',
        created_at: 1712793800000,
      },
      {
        id: 4,
        url: 'https://arxiv.org/paper2',
        title: 'Another Paper',
        domain: 'arxiv.org',
        timestamp: 1712793900000,
        date: '2026-04-10',
        source: 'backfill',
        status: 'captured',
        created_at: 1712793900000,
      },
      {
        id: 5,
        url: 'https://example.com/page3',
        title: 'Third Example',
        domain: 'example.com',
        timestamp: 1712794000000,
        date: '2026-04-10',
        source: 'live',
        status: 'captured',
        created_at: 1712794000000,
      },
    ];

    const frontmatter = buildFrontmatter('2026-04-10', captures);

    expect(frontmatter.date).toBe('2026-04-10');
    expect(frontmatter.captures).toBe(5);
    expect(frontmatter.manual).toBe(1);
    expect(frontmatter.top_domains).toEqual(['example.com', 'arxiv.org']);
    expect(frontmatter.browsers).toEqual(['Chrome', 'Comet']);
  });

  it('buildFrontmatter with 0 captures produces minimal metadata', () => {
    const frontmatter = buildFrontmatter('2026-04-10', []);

    expect(frontmatter.date).toBe('2026-04-10');
    expect(frontmatter.captures).toBe(0);
    expect(frontmatter.manual).toBe(0);
    expect(frontmatter.top_domains).toEqual([]);
    expect(frontmatter.browsers).toEqual(['Chrome', 'Comet']);
  });

  it('renderFrontmatter produces valid YAML frontmatter block', () => {
    const captures: CaptureRow[] = [
      {
        id: 1,
        url: 'https://example.com/page1',
        title: 'Example Page',
        domain: 'example.com',
        timestamp: 1712793600000,
        date: '2026-04-10',
        source: 'live',
        status: 'captured',
        created_at: 1712793600000,
      },
    ];

    const yaml = renderFrontmatter('2026-04-10', captures);

    expect(yaml).toContain('---');
    expect(yaml).toMatch(/date: ['"]2026-04-10['"]/);
    expect(yaml).toContain('captures: 1');
    expect(yaml).toContain('manual: 0');
  });
});

describe('escapeMarkdown', () => {
  it('escapes special characters in titles', () => {
    const result = escapeMarkdown('Title [with] *special* chars');
    expect(result).toBe('Title \\[with\\] \\*special\\* chars');
  });

  it('returns normal title unchanged', () => {
    const result = escapeMarkdown('Normal title');
    expect(result).toBe('Normal title');
  });

  it('escapes all markdown special characters', () => {
    const result = escapeMarkdown('[]()*_#`\\-!+');
    expect(result).toBe('\\[\\]\\(\\)\\*\\_\\#\\`\\\\\\-\\!\\+');
  });
});

describe('formatEntry', () => {
  const baseEntry: CaptureRow = {
    id: 1,
    url: 'https://example.com/path/to/page',
    title: 'Example Page',
    domain: 'example.com',
    timestamp: 1712793600000,
    date: '2026-04-10',
    source: 'live',
    status: 'captured',
    created_at: 1712793600000,
  };

  it('formats live capture with description', () => {
    const entry = { ...baseEntry, description: 'A great article about something' };
    const result = formatEntry(entry);

    expect(result).toBe('- [Example Page](https://example.com/path/to/page) — example.com/path/to/page\n  A great article about something');
  });

  it('formats manual capture with star prefix and description', () => {
    const entry = { ...baseEntry, source: 'manual' as const, description: 'Important paper' };
    const result = formatEntry(entry);

    expect(result).toBe('- ⭐ [Example Page](https://example.com/path/to/page) — example.com/path/to/page\n  Important paper');
  });

  it('formats backfill capture with history suffix and description', () => {
    const entry = { ...baseEntry, source: 'backfill' as const, description: 'From browser history' };
    const result = formatEntry(entry);

    expect(result).toBe('- [Example Page](https://example.com/path/to/page) — example.com/path/to/page *(from history)*\n  From browser history');
  });

  it('formats entry without description as single line', () => {
    const result = formatEntry(baseEntry);

    expect(result).toBe('- [Example Page](https://example.com/path/to/page) — example.com/path/to/page');
  });

  it('escapes special characters in title', () => {
    const entry = { ...baseEntry, title: 'Title [with] *special* chars' };
    const result = formatEntry(entry);

    expect(result).toContain('[Title \\[with\\] \\*special\\* chars]');
  });
});

describe('groupByDomain', () => {
  it('groups entries by domain and sorts domains alphabetically', () => {
    const entries: CaptureRow[] = [
      {
        id: 1,
        url: 'https://zebra.com/page1',
        title: 'Zebra 1',
        domain: 'zebra.com',
        timestamp: 1712793600000,
        date: '2026-04-10',
        source: 'live',
        status: 'captured',
        created_at: 1712793600000,
      },
      {
        id: 2,
        url: 'https://apple.com/page1',
        title: 'Apple 1',
        domain: 'apple.com',
        timestamp: 1712793700000,
        date: '2026-04-10',
        source: 'live',
        status: 'captured',
        created_at: 1712793700000,
      },
      {
        id: 3,
        url: 'https://zebra.com/page2',
        title: 'Zebra 2',
        domain: 'zebra.com',
        timestamp: 1712793800000,
        date: '2026-04-10',
        source: 'live',
        status: 'captured',
        created_at: 1712793800000,
      },
    ];

    const grouped = groupByDomain(entries);
    const domains = Object.keys(grouped);

    expect(domains).toEqual(['apple.com', 'zebra.com']);
    expect(grouped['zebra.com']).toHaveLength(2);
    expect(grouped['apple.com']).toHaveLength(1);
    expect(grouped['zebra.com'][0].title).toBe('Zebra 1');
    expect(grouped['zebra.com'][1].title).toBe('Zebra 2');
  });
});

describe('generateDailyNote', () => {
  const mockCaptures: CaptureRow[] = [
    {
      id: 1,
      url: 'https://example.com/page1',
      title: 'Example Page',
      domain: 'example.com',
      timestamp: 1712793600000,
      date: '2026-04-10',
      source: 'live',
      status: 'captured',
      created_at: 1712793600000,
    },
    {
      id: 2,
      url: 'https://arxiv.org/paper1',
      title: 'Research Paper',
      domain: 'arxiv.org',
      timestamp: 1712793700000,
      date: '2026-04-10',
      source: 'manual',
      status: 'captured',
      created_at: 1712793700000,
    },
  ];

  it('produces complete note with frontmatter, Highlights section, and Browsing Log', () => {
    const note = generateDailyNote('2026-04-10', mockCaptures);

    expect(note).toContain('---');
    expect(note).toMatch(/date: ['"]2026-04-10['"]/);
    expect(note).toContain('## Highlights');
    expect(note).toContain('*AI-curated summary will appear here after Phase 5*');
    expect(note).toContain('## Browsing Log');
  });

  it('groups entries under domain subheadings', () => {
    const note = generateDailyNote('2026-04-10', mockCaptures);

    expect(note).toContain('### arxiv.org');
    expect(note).toContain('### example.com');
  });

  it('includes formatted entries with source markers', () => {
    const descriptions = new Map([
      ['https://example.com/page1', 'A great article'],
      ['https://arxiv.org/paper1', 'Important paper'],
    ]);
    const note = generateDailyNote('2026-04-10', mockCaptures, descriptions);

    expect(note).toContain('- [Example Page]');
    expect(note).toContain('- ⭐ [Research Paper]');
    expect(note).toContain('  A great article');
    expect(note).toContain('  Important paper');
  });

  it('is idempotent - same input produces identical output', () => {
    const descriptions = new Map([
      ['https://example.com/page1', 'A great article'],
    ]);

    const note1 = generateDailyNote('2026-04-10', mockCaptures, descriptions);
    const note2 = generateDailyNote('2026-04-10', mockCaptures, descriptions);

    expect(note1).toBe(note2);
  });

  it('handles empty entries gracefully', () => {
    const note = generateDailyNote('2026-04-10', []);

    expect(note).toContain('---');
    expect(note).toContain('captures: 0');
    expect(note).toContain('## Highlights');
    expect(note).toContain('## Browsing Log');
  });
});
