import { describe, it, expect } from 'vitest';
import { CaptureEntry, CaptureEntrySchema, ProcessingStatus, PROCESSING_STATUSES } from '../src/types.js';

describe('Shared Types', () => {
  it('Test 1: CaptureEntry type has all required fields', () => {
    const validEntry: CaptureEntry = {
      url: 'https://example.com',
      title: 'Example',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'live',
    };

    // Type checking ensures all fields exist
    expect(validEntry.url).toBeDefined();
    expect(validEntry.title).toBeDefined();
    expect(validEntry.domain).toBeDefined();
    expect(validEntry.timestamp).toBeDefined();
    expect(validEntry.source).toBeDefined();
  });

  it('Test 2: CaptureEntrySchema validates valid entries and rejects invalid ones', () => {
    const validEntry = {
      url: 'https://example.com',
      title: 'Example',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'live',
    };

    const result = CaptureEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);

    const invalidEntry = {
      url: 'not-a-url',
      title: 'Example',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'live',
    };

    const invalidResult = CaptureEntrySchema.safeParse(invalidEntry);
    expect(invalidResult.success).toBe(false);
  });

  it('Test 3: ProcessingStatus covers all four states', () => {
    expect(PROCESSING_STATUSES).toContain('captured');
    expect(PROCESSING_STATUSES).toContain('content_fetched');
    expect(PROCESSING_STATUSES).toContain('curated');
    expect(PROCESSING_STATUSES).toContain('written');
    expect(PROCESSING_STATUSES).toHaveLength(4);

    const status: ProcessingStatus = 'captured';
    expect(['captured', 'content_fetched', 'curated', 'written']).toContain(status);
  });
});
