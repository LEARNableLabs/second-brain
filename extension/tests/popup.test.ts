import { describe, it, expect, vi } from 'vitest';
import { formatTimeAgo, showToast, updatePauseUI, initPopup } from '../entrypoints/popup/main';

// Mock chrome.storage for webextension-polyfill
const mockStorage: Record<string, any> = {};
const mockStorageAPI = {
  get: vi.fn(async (keys?: string | string[]) => {
    if (!keys) return { ...mockStorage };
    if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
    const result: Record<string, any> = {};
    if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = mockStorage[key];
      });
    }
    return result;
  }),
  set: vi.fn(async (items: Record<string, any>) => {
    Object.assign(mockStorage, items);
  }),
  remove: vi.fn(),
  clear: vi.fn(),
};

// Setup chrome global for webextension-polyfill
(globalThis as any).chrome = {
  storage: { local: mockStorageAPI },
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://test/${path}`),
  },
  tabs: {
    query: vi.fn(async () => []),
  },
};

describe('formatTimeAgo', () => {
  it('returns "just now" for elapsed < 60 seconds', () => {
    expect(formatTimeAgo(0)).toBe('just now');
    expect(formatTimeAgo(30000)).toBe('just now');
    expect(formatTimeAgo(59999)).toBe('just now');
  });

  it('returns "N min ago" for elapsed 1-59 minutes', () => {
    expect(formatTimeAgo(60000)).toBe('1 min ago');
    expect(formatTimeAgo(300000)).toBe('5 min ago');
    expect(formatTimeAgo(3540000)).toBe('59 min ago');
  });

  it('returns "Nh ago" for elapsed 1-23 hours', () => {
    expect(formatTimeAgo(3600000)).toBe('1h ago');
    expect(formatTimeAgo(7200000)).toBe('2h ago');
    expect(formatTimeAgo(82800000)).toBe('23h ago');
  });

  it('returns "yesterday" for elapsed >= 24 hours', () => {
    expect(formatTimeAgo(86400000)).toBe('yesterday');
    expect(formatTimeAgo(172800000)).toBe('yesterday');
  });
});

describe('popup module exports', () => {
  it('exports initPopup function', () => {
    expect(typeof initPopup).toBe('function');
  });

  it('exports updatePauseUI function', () => {
    expect(typeof updatePauseUI).toBe('function');
  });

  it('exports showToast function', () => {
    expect(typeof showToast).toBe('function');
  });

  it('exports formatTimeAgo function', () => {
    expect(typeof formatTimeAgo).toBe('function');
  });
});
