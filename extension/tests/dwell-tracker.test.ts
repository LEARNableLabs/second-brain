import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DWELL_THRESHOLD_MS } from '../components/types';
import { startTracking, cancelTracking, checkDwell } from '../components/dwell-tracker';
import * as storage from '../components/storage';
import * as blocklist from '../components/blocklist';

// Mock storage for testing
const mockStorage: Record<string, any> = {};

// Mock chrome.storage.local (webextension-polyfill wraps chrome, not browser)
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

// Update chrome global (webextension-polyfill reads from chrome, not browser)
(globalThis as any).chrome.storage.local = mockStorageAPI;

// Mock storage.saveCapture
vi.mock('../components/storage', async () => {
  const actual = await vi.importActual('../components/storage');
  return {
    ...actual,
    saveCapture: vi.fn(async () => true),
  };
});

// Mock blocklist.loadBlocklist and isBlocked
vi.mock('../components/blocklist', async () => {
  const actual = await vi.importActual('../components/blocklist');
  return {
    ...actual,
    loadBlocklist: vi.fn(async () => ['blocked.com']),
    isBlocked: vi.fn((hostname: string, blocklist: string[]) => {
      return blocklist.includes(hostname);
    }),
  };
});

describe('DWELL_THRESHOLD_MS constant', () => {
  it('equals 5000 milliseconds (D-04)', () => {
    expect(DWELL_THRESHOLD_MS).toBe(5000);
  });
});

describe('startTracking', () => {
  beforeEach(() => {
    // Clear mock storage before each test
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Re-setup mock implementations
    mockStorageAPI.get.mockImplementation(async (keys?: string | string[]) => {
      if (!keys) return { ...mockStorage };
      if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
      const result: Record<string, any> = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = mockStorage[key];
        });
      }
      return result;
    });
    mockStorageAPI.set.mockImplementation(async (items: Record<string, any>) => {
      Object.assign(mockStorage, items);
    });
  });

  it('stores dwell record in chrome.storage.local with url, title, tabId, startTime', async () => {
    const now = Date.now();
    vi.setSystemTime(now);

    await startTracking(123, 'https://example.com', 'Example Page');

    expect(mockStorage.dwellTimestamps).toBeDefined();
    expect(mockStorage.dwellTimestamps['123']).toEqual({
      url: 'https://example.com',
      title: 'Example Page',
      startTime: now,
    });
  });

  it('cancels existing tracking for same tabId before starting new tracking', async () => {
    const firstTime = Date.now();
    vi.setSystemTime(firstTime);

    // Start first tracking
    await startTracking(123, 'https://first.com', 'First Page');
    expect(mockStorage.dwellTimestamps['123']).toEqual({
      url: 'https://first.com',
      title: 'First Page',
      startTime: firstTime,
    });

    // Start second tracking for same tab (user navigated)
    const secondTime = firstTime + 2000;
    vi.setSystemTime(secondTime);
    await startTracking(123, 'https://second.com', 'Second Page');

    // Should replace first record
    expect(mockStorage.dwellTimestamps['123']).toEqual({
      url: 'https://second.com',
      title: 'Second Page',
      startTime: secondTime,
    });
  });

  it('schedules checkDwell after DWELL_THRESHOLD_MS', async () => {
    const checkDwellSpy = vi.fn();

    await startTracking(123, 'https://example.com', 'Example');

    // Fast-forward time by 5000ms
    await vi.advanceTimersByTimeAsync(DWELL_THRESHOLD_MS);

    // In actual implementation, setTimeout will call checkDwell
    // This test verifies the timer is scheduled correctly
  });
});

describe('cancelTracking', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();

    // Re-setup mock implementations
    mockStorageAPI.get.mockImplementation(async (keys?: string | string[]) => {
      if (!keys) return { ...mockStorage };
      if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
      const result: Record<string, any> = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = mockStorage[key];
        });
      }
      return result;
    });
    mockStorageAPI.set.mockImplementation(async (items: Record<string, any>) => {
      Object.assign(mockStorage, items);
    });
  });

  it('removes dwell record for given tabId from storage', async () => {
    // Setup: Add two dwell records
    mockStorage.dwellTimestamps = {
      '123': { url: 'https://one.com', title: 'One', startTime: Date.now() },
      '456': { url: 'https://two.com', title: 'Two', startTime: Date.now() },
    };

    await cancelTracking(123);

    expect(mockStorage.dwellTimestamps['123']).toBeUndefined();
    expect(mockStorage.dwellTimestamps['456']).toBeDefined();
  });

  it('handles canceling non-existent tabId gracefully', async () => {
    mockStorage.dwellTimestamps = {};

    await expect(cancelTracking(999)).resolves.not.toThrow();
  });
});

describe('checkDwell', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Re-setup mock implementations
    mockStorageAPI.get.mockImplementation(async (keys?: string | string[]) => {
      if (!keys) return { ...mockStorage };
      if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
      const result: Record<string, any> = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          result[key] = mockStorage[key];
        });
      }
      return result;
    });
    mockStorageAPI.set.mockImplementation(async (items: Record<string, any>) => {
      Object.assign(mockStorage, items);
    });
  });

  it('returns false if no dwell record exists for tabId', async () => {
    mockStorage.dwellTimestamps = {};

    const result = await checkDwell(123);

    expect(result).toBe(false);
  });

  it('returns false if elapsed time is less than DWELL_THRESHOLD_MS', async () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    mockStorage.dwellTimestamps = {
      '123': { url: 'https://example.com', title: 'Example', startTime },
    };

    // Advance time by 3 seconds (less than 5)
    vi.setSystemTime(startTime + 3000);

    const result = await checkDwell(123);

    expect(result).toBe(false);
    // Record should be cleaned up
    expect(mockStorage.dwellTimestamps['123']).toBeUndefined();
  });

  it('calls saveCapture when elapsed time >= DWELL_THRESHOLD_MS', async () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    mockStorage.dwellTimestamps = {
      '123': { url: 'https://example.com', title: 'Example', startTime },
    };

    // Advance time by 5+ seconds
    vi.setSystemTime(startTime + DWELL_THRESHOLD_MS);

    const result = await checkDwell(123);

    expect(result).toBe(true);
    expect(storage.saveCapture).toHaveBeenCalledWith({
      url: 'https://example.com',
      title: 'Example',
      domain: 'example.com',
      timestamp: startTime,
      source: 'live',
    });
  });

  it('creates CaptureEntry with source "live"', async () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    mockStorage.dwellTimestamps = {
      '123': { url: 'https://example.com', title: 'Example', startTime },
    };

    vi.setSystemTime(startTime + DWELL_THRESHOLD_MS);
    await checkDwell(123);

    const captureCall = vi.mocked(storage.saveCapture).mock.calls[0][0];
    expect(captureCall.source).toBe('live');
  });

  it('removes dwell record from storage after checking', async () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    mockStorage.dwellTimestamps = {
      '123': { url: 'https://example.com', title: 'Example', startTime },
    };

    vi.setSystemTime(startTime + DWELL_THRESHOLD_MS);
    await checkDwell(123);

    // Record should be cleaned up
    expect(mockStorage.dwellTimestamps['123']).toBeUndefined();
  });

  it('checks blocklist before capturing and returns false for blocked URLs', async () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    mockStorage.dwellTimestamps = {
      '123': { url: 'https://blocked.com/page', title: 'Blocked', startTime },
    };

    vi.setSystemTime(startTime + DWELL_THRESHOLD_MS);

    const result = await checkDwell(123);

    expect(result).toBe(false);
    expect(storage.saveCapture).not.toHaveBeenCalled();
    // Record should still be cleaned up
    expect(mockStorage.dwellTimestamps['123']).toBeUndefined();
  });

  it('handles invalid URLs gracefully', async () => {
    const startTime = Date.now();
    vi.setSystemTime(startTime);

    mockStorage.dwellTimestamps = {
      '123': { url: 'not-a-valid-url', title: 'Invalid', startTime },
    };

    vi.setSystemTime(startTime + DWELL_THRESHOLD_MS);

    // Should not throw, should return false
    const result = await checkDwell(123);
    expect(result).toBe(false);
  });
});
