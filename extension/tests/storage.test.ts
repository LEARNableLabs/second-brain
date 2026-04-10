import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CaptureEntrySchema,
  StorageStateSchema,
  BlocklistConfigSchema
} from '../components/types';
import { saveManualCapture, getToday } from '../components/storage';
import { ZodError } from 'zod';

describe('CaptureEntrySchema', () => {
  it('validates correct entry with all fields', () => {
    const validEntry = {
      url: 'https://example.com/page',
      title: 'Example Page',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'live' as const,
    };

    const result = CaptureEntrySchema.parse(validEntry);
    expect(result).toEqual(validEntry);
  });

  it('rejects entry missing url field', () => {
    const invalidEntry = {
      title: 'Example Page',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'live',
    };

    expect(() => CaptureEntrySchema.parse(invalidEntry)).toThrow(ZodError);
  });

  it('rejects entry with invalid url format', () => {
    const invalidEntry = {
      url: 'not-a-url',
      title: 'Example Page',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'live',
    };

    expect(() => CaptureEntrySchema.parse(invalidEntry)).toThrow(ZodError);
  });

  it('rejects entry with invalid source value', () => {
    const invalidEntry = {
      url: 'https://example.com',
      title: 'Example Page',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'invalid',
    };

    expect(() => CaptureEntrySchema.parse(invalidEntry)).toThrow(ZodError);
  });

  it('accepts backfill as source value', () => {
    const validEntry = {
      url: 'https://example.com',
      title: 'Example Page',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'backfill' as const,
    };

    const result = CaptureEntrySchema.parse(validEntry);
    expect(result.source).toBe('backfill');
  });

  it('accepts manual as source value', () => {
    const validEntry = {
      url: 'https://example.com',
      title: 'Example Page',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'manual' as const,
    };

    const result = CaptureEntrySchema.parse(validEntry);
    expect(result.source).toBe('manual');
  });
});

describe('StorageStateSchema', () => {
  it('provides defaults for missing fields', () => {
    const partial = {};
    const result = StorageStateSchema.parse(partial);

    expect(result.isPaused).toBe(false);
    expect(result.blocklist).toEqual([]);
    expect(result.captures).toEqual({});
    expect(result.lastCaptureTimestamp).toBe(0);
    expect(result.dwellTimestamps).toEqual({});
  });

  it('parses partial data with defaults', () => {
    const partial = {
      isPaused: true,
      blocklist: ['google.com'],
    };

    const result = StorageStateSchema.parse(partial);

    expect(result.isPaused).toBe(true);
    expect(result.blocklist).toEqual(['google.com']);
    expect(result.captures).toEqual({}); // default
    expect(result.lastCaptureTimestamp).toBe(0); // default
    expect(result.dwellTimestamps).toEqual({}); // default
  });

  it('validates complete storage state', () => {
    const complete = {
      isPaused: false,
      blocklist: ['google.com', 'facebook.com'],
      captures: {
        '2026-04-09': [
          {
            url: 'https://example.com',
            title: 'Example',
            domain: 'example.com',
            timestamp: Date.now(),
            source: 'live' as const,
          },
        ],
      },
      lastCaptureTimestamp: Date.now(),
      dwellTimestamps: {
        '123': {
          url: 'https://test.com',
          title: 'Test',
          startTime: Date.now(),
        },
      },
    };

    const result = StorageStateSchema.parse(complete);
    expect(result).toEqual(complete);
  });
});

describe('BlocklistConfigSchema', () => {
  it('validates default blocklist.json structure', () => {
    const config = {
      google: ['google.com', 'gmail.com'],
      banking: ['chase.com', 'paypal.com'],
      social: ['twitter.com', 'facebook.com'],
      auth: ['localhost', 'auth0.com'],
      custom: [],
    };

    const result = BlocklistConfigSchema.parse(config);
    expect(result).toEqual(config);
  });

  it('provides default empty array for custom field', () => {
    const config = {
      google: ['google.com'],
      banking: [],
      social: [],
      auth: [],
    };

    const result = BlocklistConfigSchema.parse(config);
    expect(result.custom).toEqual([]);
  });

  it('rejects config missing required categories', () => {
    const invalidConfig = {
      google: ['google.com'],
      // missing banking, social, auth
    };

    expect(() => BlocklistConfigSchema.parse(invalidConfig)).toThrow(ZodError);
  });
});

describe('saveManualCapture', () => {
  let mockStorageData: Record<string, any>;

  beforeEach(() => {
    mockStorageData = {};
    const chromeStorage = (globalThis as any).chrome.storage.local;
    chromeStorage.get.mockImplementation(async (keys?: string | string[]) => {
      if (!keys) return { ...mockStorageData };
      if (typeof keys === 'string') return { [keys]: mockStorageData[keys] };
      const result: Record<string, any> = {};
      if (Array.isArray(keys)) {
        keys.forEach((key: string) => { result[key] = mockStorageData[key]; });
      }
      return result;
    });
    chromeStorage.set.mockImplementation(async (items: Record<string, any>) => {
      Object.assign(mockStorageData, items);
    });
  });

  it('saves a new manual capture entry', async () => {
    const result = await saveManualCapture('https://example.com', 'Example', 'example.com');
    expect(result).toBe(true);

    const today = getToday();
    expect(mockStorageData.captures[today]).toHaveLength(1);
    expect(mockStorageData.captures[today][0].source).toBe('manual');
    expect(mockStorageData.captures[today][0].url).toBe('https://example.com');
  });

  it('upgrades existing live entry to manual', async () => {
    const today = getToday();
    mockStorageData.captures = {
      [today]: [{
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com',
        timestamp: Date.now() - 60000,
        source: 'live',
      }],
    };

    const result = await saveManualCapture('https://example.com', 'Example', 'example.com');
    expect(result).toBe(true);

    // Should still be one entry, not two (D-05 dedup maintained)
    expect(mockStorageData.captures[today]).toHaveLength(1);
    // Source should be upgraded to manual
    expect(mockStorageData.captures[today][0].source).toBe('manual');
  });

  it('upgrades existing backfill entry to manual', async () => {
    const today = getToday();
    mockStorageData.captures = {
      [today]: [{
        url: 'https://example.com',
        title: 'Example',
        domain: 'example.com',
        timestamp: Date.now() - 60000,
        source: 'backfill',
      }],
    };

    const result = await saveManualCapture('https://example.com', 'Example', 'example.com');
    expect(result).toBe(true);
    expect(mockStorageData.captures[today]).toHaveLength(1);
    expect(mockStorageData.captures[today][0].source).toBe('manual');
  });

  it('saves manual capture on blocked domain (bypasses blocklist)', async () => {
    // saveManualCapture does not check blocklist — that's the point
    const result = await saveManualCapture('https://gmail.com/inbox', 'Gmail', 'gmail.com');
    expect(result).toBe(true);

    const today = getToday();
    expect(mockStorageData.captures[today]).toHaveLength(1);
    expect(mockStorageData.captures[today][0].domain).toBe('gmail.com');
    expect(mockStorageData.captures[today][0].source).toBe('manual');
  });

  it('updates lastCaptureTimestamp on manual save', async () => {
    const before = Date.now();
    await saveManualCapture('https://example.com', 'Example', 'example.com');
    expect(mockStorageData.lastCaptureTimestamp).toBeGreaterThanOrEqual(before);
  });
});
