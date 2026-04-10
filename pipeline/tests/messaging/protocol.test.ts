import { describe, it, expect } from 'vitest';
import { handleMessage } from '../../src/messaging/host.js';

describe('Native Messaging Protocol', () => {
  it('should handle getCaptures with multiple captures', () => {
    const message = {
      action: 'getCaptures' as const,
      captures: {
        '2026-04-10': [
          { url: 'https://example.com', title: 'Example', domain: 'example.com', timestamp: 1234567890, source: 'live' },
          { url: 'https://test.com', title: 'Test', domain: 'test.com', timestamp: 1234567891, source: 'live' },
        ],
      },
    };

    const response = handleMessage(message);

    expect(response).toEqual({
      success: true,
      received: 2,
      captures: {
        '2026-04-10': [
          { url: 'https://example.com', title: 'Example', domain: 'example.com', timestamp: 1234567890, source: 'live' },
          { url: 'https://test.com', title: 'Test', domain: 'test.com', timestamp: 1234567891, source: 'live' },
        ],
      },
    });
  });

  it('should handle ping action', () => {
    const message = { action: 'ping' as const };
    const response = handleMessage(message);
    expect(response).toEqual({ pong: true });
  });

  it('should return error for unknown action', () => {
    const message = { action: 'unknown' } as any;
    const response = handleMessage(message);
    expect(response).toEqual({ error: 'Unknown action: unknown' });
  });

  it('should handle getCaptures with empty captures', () => {
    const message = {
      action: 'getCaptures' as const,
      captures: {},
    };

    const response = handleMessage(message);

    expect(response).toEqual({
      success: true,
      received: 0,
      captures: {},
    });
  });

  it('should handle getCaptures across multiple days', () => {
    const message = {
      action: 'getCaptures' as const,
      captures: {
        '2026-04-10': [
          { url: 'https://example.com', title: 'Example', domain: 'example.com', timestamp: 1234567890, source: 'live' },
        ],
        '2026-04-09': [
          { url: 'https://test.com', title: 'Test', domain: 'test.com', timestamp: 1234567891, source: 'live' },
          { url: 'https://demo.com', title: 'Demo', domain: 'demo.com', timestamp: 1234567892, source: 'manual' },
        ],
      },
    };

    const response = handleMessage(message);

    expect(response).toEqual({
      success: true,
      received: 3,
      captures: message.captures,
    });
  });
});
