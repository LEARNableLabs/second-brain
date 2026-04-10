import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BACKFILL_MAX_LOOKBACK_DAYS, BACKFILL_MAX_RESULTS } from '../components/types';

// Mock webextension-polyfill with factory function
vi.mock('webextension-polyfill', () => ({
  default: {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
    },
    history: {
      search: vi.fn(),
    },
  },
}));

// Import after mock setup
import { detectGap, backfillHistory } from '../components/history-backfill';
import browser from 'webextension-polyfill';

// Type-safe mock access
const mockStorage = browser.storage.local as any;
const mockHistory = browser.history as any;

describe('BACKFILL_MAX_LOOKBACK_DAYS constant', () => {
  it('equals 7 days (D-14)', () => {
    expect(BACKFILL_MAX_LOOKBACK_DAYS).toBe(7);
  });
});

describe('BACKFILL_MAX_RESULTS constant', () => {
  it('equals 1000 results', () => {
    expect(BACKFILL_MAX_RESULTS).toBe(1000);
  });
});

describe('detectGap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('returns a 24-hour lookback timestamp on first run (lastCaptureTimestamp is 0)', async () => {
    const now = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({ lastCaptureTimestamp: 0 });

    const result = await detectGap();

    // Should return now - 24 hours (backfill last day on first run)
    expect(result).toBe(now - (24 * 60 * 60 * 1000));

    vi.useRealTimers();
  });

  it('returns null when lastCaptureTimestamp is within last 5 minutes (no gap)', async () => {
    const now = Date.now();
    const fourMinutesAgo = now - (4 * 60 * 1000); // 4 minutes = no gap

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({ lastCaptureTimestamp: fourMinutesAgo });

    const result = await detectGap();

    expect(result).toBeNull();

    vi.useRealTimers();
  });

  it('returns the lastCaptureTimestamp when gap is > 5 minutes', async () => {
    const now = Date.now();
    const tenMinutesAgo = now - (10 * 60 * 1000); // 10 minutes = gap detected

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({ lastCaptureTimestamp: tenMinutesAgo });

    const result = await detectGap();

    expect(result).toBe(tenMinutesAgo);

    vi.useRealTimers();
  });
});

describe('backfillHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('calls browser.history.search with correct startTime and endTime', async () => {
    // Use noon UTC to avoid date boundary issues when oneHourAgo crosses midnight
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    const oneHourAgo = now - (60 * 60 * 1000);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({
      captures: {},
      blocklist: [],
    });
    mockHistory.search.mockResolvedValue([]);

    await backfillHistory(oneHourAgo);

    expect(mockHistory.search).toHaveBeenCalledWith({
      text: '',
      startTime: oneHourAgo,
      endTime: now,
      maxResults: BACKFILL_MAX_RESULTS,
    });

    vi.useRealTimers();
  });

  it('respects BACKFILL_MAX_LOOKBACK_DAYS (caps lookback at 7 days)', async () => {
    const now = Date.now();
    const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000); // 10 days ago
    const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000); // 7 days ago (cap)

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({
      captures: {},
      blocklist: [],
    });
    mockHistory.search.mockResolvedValue([]);

    await backfillHistory(tenDaysAgo);

    // Should cap startTime at 7 days ago, not use the 10-day-old timestamp
    expect(mockHistory.search).toHaveBeenCalledWith({
      text: '',
      startTime: sevenDaysAgo,
      endTime: now,
      maxResults: BACKFILL_MAX_RESULTS,
    });

    vi.useRealTimers();
  });

  it('filters out blocked domains from history results', async () => {
    // Use noon UTC to avoid date boundary issues when oneHourAgo crosses midnight
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    const oneHourAgo = now - (60 * 60 * 1000);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({
      captures: {},
      blocklist: ['google.com', 'facebook.com'],
    });

    mockHistory.search.mockResolvedValue([
      { url: 'https://example.com/page', title: 'Example', lastVisitTime: oneHourAgo + 1000 },
      { url: 'https://mail.google.com/inbox', title: 'Gmail', lastVisitTime: oneHourAgo + 2000 },
      { url: 'https://facebook.com/feed', title: 'Facebook', lastVisitTime: oneHourAgo + 3000 },
      { url: 'https://news.ycombinator.com', title: 'HN', lastVisitTime: oneHourAgo + 4000 },
    ]);

    await backfillHistory(oneHourAgo);

    // Should save only example.com and news.ycombinator.com (not google.com or facebook.com)
    const setCalls = mockStorage.set.mock.calls;
    const lastSetCall = setCalls[setCalls.length - 1][0];
    const today = new Date().toISOString().split('T')[0];
    const savedCaptures = lastSetCall.captures[today];

    expect(savedCaptures).toHaveLength(2);
    expect(savedCaptures[0].domain).toBe('example.com');
    expect(savedCaptures[1].domain).toBe('news.ycombinator.com');

    vi.useRealTimers();
  });

  it('creates entries with source "backfill" (not "live")', async () => {
    // Use noon UTC to avoid date boundary issues when oneHourAgo crosses midnight
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    const oneHourAgo = now - (60 * 60 * 1000);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({
      captures: {},
      blocklist: [],
    });

    mockHistory.search.mockResolvedValue([
      { url: 'https://example.com/page', title: 'Example', lastVisitTime: oneHourAgo + 1000 },
    ]);

    await backfillHistory(oneHourAgo);

    const setCalls = mockStorage.set.mock.calls;
    const lastSetCall = setCalls[setCalls.length - 1][0];
    const today = new Date().toISOString().split('T')[0];
    const savedCaptures = lastSetCall.captures[today];

    expect(savedCaptures[0].source).toBe('backfill');

    vi.useRealTimers();
  });

  it('deduplicates against existing captures for the same day', async () => {
    // Use noon UTC to avoid date boundary issues
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    const oneHourAgo = now - (60 * 60 * 1000);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    const today = new Date().toISOString().split('T')[0];

    // Pre-existing captures for today (one duplicate URL)
    mockStorage.get.mockResolvedValue({
      captures: {
        [today]: [
          { url: 'https://example.com/page', title: 'Example', domain: 'example.com', timestamp: oneHourAgo, source: 'live' },
        ],
      },
      blocklist: [],
    });

    mockHistory.search.mockResolvedValue([
      { url: 'https://example.com/page', title: 'Example Updated', lastVisitTime: oneHourAgo + 1000 }, // duplicate
      { url: 'https://news.ycombinator.com', title: 'HN', lastVisitTime: oneHourAgo + 2000 }, // new
    ]);

    await backfillHistory(oneHourAgo);

    const setCalls = mockStorage.set.mock.calls;
    const lastSetCall = setCalls[setCalls.length - 1][0];
    const savedCaptures = lastSetCall.captures[today];

    // Should have 2 total: 1 existing + 1 new (duplicate skipped)
    expect(savedCaptures).toHaveLength(2);
    expect(savedCaptures.find((c: any) => c.url === 'https://news.ycombinator.com')).toBeDefined();

    vi.useRealTimers();
  });

  it('sets maxResults to BACKFILL_MAX_RESULTS (1000)', async () => {
    // Use noon UTC to avoid date boundary issues when oneHourAgo crosses midnight
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    const oneHourAgo = now - (60 * 60 * 1000);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({
      captures: {},
      blocklist: [],
    });
    mockHistory.search.mockResolvedValue([]);

    await backfillHistory(oneHourAgo);

    expect(mockHistory.search).toHaveBeenCalledWith(
      expect.objectContaining({ maxResults: BACKFILL_MAX_RESULTS })
    );

    vi.useRealTimers();
  });

  it('updates lastCaptureTimestamp to current time after completion', async () => {
    // Use noon UTC to avoid date boundary issues when oneHourAgo crosses midnight
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    const oneHourAgo = now - (60 * 60 * 1000);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({
      captures: {},
      blocklist: [],
    });

    mockHistory.search.mockResolvedValue([
      { url: 'https://example.com', title: 'Example', lastVisitTime: oneHourAgo + 1000 },
    ]);

    await backfillHistory(oneHourAgo);

    const setCalls = mockStorage.set.mock.calls;
    const lastSetCall = setCalls[setCalls.length - 1][0];

    expect(lastSetCall.lastCaptureTimestamp).toBe(now);

    vi.useRealTimers();
  });

  it('filters out non-http URLs (chrome://, about://, etc.)', async () => {
    // Use noon UTC to avoid date boundary issues when oneHourAgo crosses midnight
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    const oneHourAgo = now - (60 * 60 * 1000);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({
      captures: {},
      blocklist: [],
    });

    mockHistory.search.mockResolvedValue([
      { url: 'https://example.com', title: 'Example', lastVisitTime: oneHourAgo + 1000 },
      { url: 'chrome://extensions', title: 'Extensions', lastVisitTime: oneHourAgo + 2000 },
      { url: 'about:blank', title: 'Blank', lastVisitTime: oneHourAgo + 3000 },
      { url: 'http://news.ycombinator.com', title: 'HN', lastVisitTime: oneHourAgo + 4000 },
    ]);

    await backfillHistory(oneHourAgo);

    const setCalls = mockStorage.set.mock.calls;
    const lastSetCall = setCalls[setCalls.length - 1][0];
    const today = new Date().toISOString().split('T')[0];
    const savedCaptures = lastSetCall.captures[today];

    // Should save only https and http URLs (not chrome:// or about:)
    expect(savedCaptures).toHaveLength(2);
    expect(savedCaptures.every((c: any) => c.url.startsWith('http'))).toBe(true);

    vi.useRealTimers();
  });

  it('returns count of entries backfilled', async () => {
    // Use noon UTC to avoid date boundary issues when oneHourAgo crosses midnight
    const now = new Date('2026-04-10T12:00:00.000Z').getTime();
    const oneHourAgo = now - (60 * 60 * 1000);

    vi.useFakeTimers();
    vi.setSystemTime(now);

    mockStorage.get.mockResolvedValue({
      captures: {},
      blocklist: [],
    });

    mockHistory.search.mockResolvedValue([
      { url: 'https://example.com', title: 'Example', lastVisitTime: oneHourAgo + 1000 },
      { url: 'https://news.ycombinator.com', title: 'HN', lastVisitTime: oneHourAgo + 2000 },
      { url: 'https://github.com', title: 'GitHub', lastVisitTime: oneHourAgo + 3000 },
    ]);

    const count = await backfillHistory(oneHourAgo);

    expect(count).toBe(3);

    vi.useRealTimers();
  });
});
