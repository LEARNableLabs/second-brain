import { vi } from 'vitest';

// Mock chrome/browser extension APIs for testing
// This allows webextension-polyfill to load without throwing errors
// Set up chrome global BEFORE webextension-polyfill loads
(globalThis as any).chrome = {
  runtime: {
    id: 'mock-extension-id',
    getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
    sendMessage: vi.fn(),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
    },
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
      clear: vi.fn(),
    },
  },
  tabs: {
    query: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
  },
} as any;

// Also set browser global for webextension-polyfill
(globalThis as any).browser = (globalThis as any).chrome;
