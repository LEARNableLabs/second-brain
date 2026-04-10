import { describe, it, expect } from 'vitest';
import { ExportResponseSchema, CaptureEntrySchema } from '../src/schemas.js';

describe('Shared Schemas', () => {
  it('ExportResponseSchema validates export responses', () => {
    const validResponse = {
      captures: {
        '2026-04-10': [{
          url: 'https://example.com',
          title: 'Example',
          domain: 'example.com',
          timestamp: Date.now(),
          source: 'live',
        }],
      },
      exportedAt: Date.now(),
    };

    const result = ExportResponseSchema.safeParse(validResponse);
    expect(result.success).toBe(true);
  });

  it('CaptureEntrySchema is re-exported from schemas', () => {
    const validEntry = {
      url: 'https://example.com',
      title: 'Example',
      domain: 'example.com',
      timestamp: Date.now(),
      source: 'live',
    };

    const result = CaptureEntrySchema.safeParse(validEntry);
    expect(result.success).toBe(true);
  });
});
