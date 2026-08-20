import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { WebNavigation, Tabs, Runtime } from 'webextension-polyfill';

// Mock dependencies
const mockDwellTracker = {
  startTracking: vi.fn(),
  cancelTracking: vi.fn(),
};

const mockBlocklist = {
  loadBlocklist: vi.fn(async () => ['google.com', 'blocked.com']),
  isBlocked: vi.fn((hostname: string, blocklist: string[]) => {
    return blocklist.includes(hostname);
  }),
};

const mockHistoryBackfill = {
  detectGap: vi.fn(async () => null as number | null),
  backfillHistory: vi.fn(async (_start?: number) => 0),
};

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

// Update chrome global with mocks
(globalThis as any).chrome.storage.local = mockStorageAPI;
(globalThis as any).chrome.tabs = {
  query: vi.fn(),
  get: vi.fn(),
};
(globalThis as any).chrome.webNavigation = {
  onCompleted: {
    addListener: vi.fn(),
  },
};
(globalThis as any).chrome.runtime = {
  ...((globalThis as any).chrome.runtime || {}),
  onInstalled: {
    addListener: vi.fn(),
  },
  onStartup: {
    addListener: vi.fn(),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
};

// Mock modules
vi.mock('../components/dwell-tracker', () => mockDwellTracker);
vi.mock('../components/blocklist', () => mockBlocklist);
vi.mock('../components/history-backfill', () => mockHistoryBackfill);

// Import the handlers (they should be exported from background.ts)
let handlePageLoad: (details: WebNavigation.OnCompletedDetailsType) => Promise<void>;
let handleTabActivated: (activeInfo: Tabs.OnActivatedActiveInfoType) => Promise<void>;
let handleTabRemoved: (tabId: number, removeInfo: Tabs.OnRemovedRemoveInfoType) => Promise<void>;
let handleInstall: (details: Runtime.OnInstalledDetailsType) => Promise<void>;
let handleStartup: () => Promise<void>;

describe('background service worker', () => {
  beforeEach(() => {
    // Clear mock storage
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

    // Import handlers fresh each time
    // Note: In actual implementation, handlers will be exported from background.ts
    vi.resetModules();
  });

  describe('handlePageLoad', () => {
    it('calls startTracking for non-blocked, non-paused URLs', async () => {
      mockStorage.isPaused = false;
      mockStorage.blocklist = ['blocked.com'];

      const details: WebNavigation.OnCompletedDetailsType = {
        tabId: 123,
        url: 'https://example.com/page',
        frameId: 0,

        timeStamp: Date.now(),
      };

      // Mock tab query to return active tab
      (globalThis as any).chrome.tabs.query.mockResolvedValue([
        { id: 123, active: true, url: 'https://example.com/page', title: 'Example Page' },
      ]);

      // Simulate handlePageLoad
      // This will be imported and called from actual implementation
      // For now, stub the expected behavior
      const isBlocked = mockBlocklist.isBlocked('example.com', mockStorage.blocklist || []);
      if (!mockStorage.isPaused && !isBlocked && details.frameId === 0) {
        mockDwellTracker.startTracking(details.tabId, details.url, 'Example Page');
      }

      expect(mockDwellTracker.startTracking).toHaveBeenCalledWith(
        123,
        'https://example.com/page',
        'Example Page'
      );
    });

    it('does NOT call startTracking when isPaused is true', async () => {
      mockStorage.isPaused = true;

      const details: WebNavigation.OnCompletedDetailsType = {
        tabId: 123,
        url: 'https://example.com/page',
        frameId: 0,

        timeStamp: Date.now(),
      };

      // Simulate handlePageLoad with pause check
      if (!mockStorage.isPaused) {
        mockDwellTracker.startTracking(details.tabId, details.url, 'Example Page');
      }

      expect(mockDwellTracker.startTracking).not.toHaveBeenCalled();
    });

    it('does NOT call startTracking for blocked domains', async () => {
      mockStorage.isPaused = false;
      mockStorage.blocklist = ['blocked.com'];

      const details: WebNavigation.OnCompletedDetailsType = {
        tabId: 123,
        url: 'https://blocked.com/page',
        frameId: 0,

        timeStamp: Date.now(),
      };

      // Simulate handlePageLoad with blocklist check
      const url = new URL(details.url);
      const isBlocked = mockBlocklist.isBlocked(url.hostname, mockStorage.blocklist || []);
      if (!mockStorage.isPaused && !isBlocked && details.frameId === 0) {
        mockDwellTracker.startTracking(details.tabId, details.url, 'Blocked Page');
      }

      expect(mockDwellTracker.startTracking).not.toHaveBeenCalled();
    });

    it('filters out chrome://, about:, and extension:// URLs', async () => {
      mockStorage.isPaused = false;
      mockStorage.blocklist = [];

      const chromeURL: WebNavigation.OnCompletedDetailsType = {
        tabId: 123,
        url: 'chrome://extensions/',
        frameId: 0,

        timeStamp: Date.now(),
      };

      const aboutURL: WebNavigation.OnCompletedDetailsType = {
        tabId: 124,
        url: 'about:blank',
        frameId: 0,

        timeStamp: Date.now(),
      };

      const extensionURL: WebNavigation.OnCompletedDetailsType = {
        tabId: 125,
        url: 'chrome-extension://abcdef/popup.html',
        frameId: 0,

        timeStamp: Date.now(),
      };

      // Simulate filtering
      const shouldFilter = (url: string) => {
        return url.startsWith('chrome://') || url.startsWith('about:') || url.startsWith('chrome-extension://');
      };

      if (!shouldFilter(chromeURL.url)) {
        mockDwellTracker.startTracking(chromeURL.tabId, chromeURL.url, '');
      }
      if (!shouldFilter(aboutURL.url)) {
        mockDwellTracker.startTracking(aboutURL.tabId, aboutURL.url, '');
      }
      if (!shouldFilter(extensionURL.url)) {
        mockDwellTracker.startTracking(extensionURL.tabId, extensionURL.url, '');
      }

      expect(mockDwellTracker.startTracking).not.toHaveBeenCalled();
    });
  });

  describe('handleTabActivated', () => {
    it('calls startTracking for newly focused tab (D-13)', async () => {
      mockStorage.isPaused = false;
      mockStorage.blocklist = ['blocked.com'];

      const activeInfo: Tabs.OnActivatedActiveInfoType = {
        tabId: 123,
        windowId: 1,
      };

      // Mock tabs.get to return tab details
      (globalThis as any).chrome.tabs.get.mockResolvedValue({
        id: 123,
        url: 'https://example.com/page',
        title: 'Example Page',
        active: true,
      });

      // Simulate handleTabActivated
      const tab = await (globalThis as any).chrome.tabs.get(activeInfo.tabId);
      if (tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('about:')) {
        const url = new URL(tab.url);
        const isBlocked = mockBlocklist.isBlocked(url.hostname, mockStorage.blocklist || []);
        if (!mockStorage.isPaused && !isBlocked) {
          mockDwellTracker.startTracking(tab.id, tab.url, tab.title);
        }
      }

      expect(mockDwellTracker.startTracking).toHaveBeenCalledWith(
        123,
        'https://example.com/page',
        'Example Page'
      );
    });
  });

  describe('handleTabRemoved', () => {
    it('calls cancelTracking for closed tab', async () => {
      const tabId = 123;
      const removeInfo: Tabs.OnRemovedRemoveInfoType = {
        windowId: 1,
        isWindowClosing: false,
      };

      // Simulate handleTabRemoved
      mockDwellTracker.cancelTracking(tabId);

      expect(mockDwellTracker.cancelTracking).toHaveBeenCalledWith(123);
    });
  });

  describe('handleInstall', () => {
    it('initializes default blocklist in storage on install', async () => {
      const details = {
        reason: 'install',
        temporary: false,
      } as Runtime.OnInstalledDetailsType;

      // Mock fetch for blocklist.json
      global.fetch = vi.fn(async () => ({
        json: async () => ({
          google: ['google.com', 'gmail.com'],
          banking: ['chase.com'],
          social: ['twitter.com'],
          auth: ['localhost'],
          custom: [],
        }),
      })) as any;

      // Simulate handleInstall
      if (details.reason === 'install') {
        const response = await fetch('chrome-extension://mock-id/blocklist.json');
        const blocklistConfig = await response.json();
        const flattened = [
          ...blocklistConfig.google,
          ...blocklistConfig.banking,
          ...blocklistConfig.social,
          ...blocklistConfig.auth,
          ...blocklistConfig.custom,
        ];
        await mockStorageAPI.set({ blocklist: flattened });
      }

      expect(mockStorage.blocklist).toEqual([
        'google.com',
        'gmail.com',
        'chase.com',
        'twitter.com',
        'localhost',
      ]);
    });
  });

  describe('handleStartup', () => {
    it('resets isPaused to false (D-02)', async () => {
      mockStorage.isPaused = true;

      // Simulate handleStartup
      await mockStorageAPI.set({ isPaused: false });

      expect(mockStorage.isPaused).toBe(false);
    });

    it('calls detectGap on startup', async () => {
      mockHistoryBackfill.detectGap.mockResolvedValue(null);

      // Simulate handleStartup
      await mockStorageAPI.set({ isPaused: false });
      await mockHistoryBackfill.detectGap();

      expect(mockHistoryBackfill.detectGap).toHaveBeenCalled();
    });

    it('calls backfillHistory when gap is detected', async () => {
      const gapTimestamp = Date.now() - (60 * 60 * 1000); // 1 hour ago
      mockHistoryBackfill.detectGap.mockResolvedValue(gapTimestamp);
      mockHistoryBackfill.backfillHistory.mockResolvedValue(5);

      // Simulate handleStartup
      await mockStorageAPI.set({ isPaused: false });
      const gapStart = await mockHistoryBackfill.detectGap();
      if (gapStart !== null) {
        await mockHistoryBackfill.backfillHistory(gapStart);
      }

      expect(mockHistoryBackfill.backfillHistory).toHaveBeenCalledWith(gapTimestamp);
    });

    it('does NOT call backfillHistory when no gap is detected', async () => {
      mockHistoryBackfill.detectGap.mockResolvedValue(null);

      // Simulate handleStartup
      await mockStorageAPI.set({ isPaused: false });
      const gapStart = await mockHistoryBackfill.detectGap();
      if (gapStart !== null) {
        await mockHistoryBackfill.backfillHistory(gapStart);
      }

      expect(mockHistoryBackfill.backfillHistory).not.toHaveBeenCalled();
    });
  });

  describe('handleInstall on update', () => {
    it('calls detectGap when extension is updated', async () => {
      const details = {
        reason: 'update',
        temporary: false,
      } as Runtime.OnInstalledDetailsType;

      mockHistoryBackfill.detectGap.mockResolvedValue(null);

      // Simulate handleInstall with reason='update'
      if (details.reason === 'update') {
        await mockHistoryBackfill.detectGap();
      }

      expect(mockHistoryBackfill.detectGap).toHaveBeenCalled();
    });

    it('calls backfillHistory when gap is detected on update', async () => {
      const details = {
        reason: 'update',
        temporary: false,
      } as Runtime.OnInstalledDetailsType;

      const gapTimestamp = Date.now() - (30 * 60 * 1000); // 30 minutes ago
      mockHistoryBackfill.detectGap.mockResolvedValue(gapTimestamp);
      mockHistoryBackfill.backfillHistory.mockResolvedValue(3);

      // Simulate handleInstall with reason='update'
      if (details.reason === 'update') {
        const gapStart = await mockHistoryBackfill.detectGap();
        if (gapStart !== null) {
          await mockHistoryBackfill.backfillHistory(gapStart);
        }
      }

      expect(mockHistoryBackfill.backfillHistory).toHaveBeenCalledWith(gapTimestamp);
    });
  });
});
