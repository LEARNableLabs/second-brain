import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStorage: Record<string, any> = {};
const mockStorageAPI = {
  get: vi.fn(async (keys?: string | string[]) => {
    if (!keys) return { ...mockStorage };
    if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
    const result: Record<string, any> = {};
    if (Array.isArray(keys)) {
      keys.forEach((key: string) => { result[key] = mockStorage[key]; });
    }
    return result;
  }),
  set: vi.fn(async (items: Record<string, any>) => {
    Object.assign(mockStorage, items);
  }),
  remove: vi.fn(),
  clear: vi.fn(),
};

(globalThis as any).chrome.storage.local = mockStorageAPI;
(globalThis as any).chrome.tabs = {
  ...(globalThis as any).chrome.tabs,
  query: vi.fn(),
  get: vi.fn(),
};
(globalThis as any).chrome.contextMenus = {
  create: vi.fn(),
  onClicked: { addListener: vi.fn() },
};
(globalThis as any).chrome.commands = {
  onCommand: { addListener: vi.fn() },
};
(globalThis as any).chrome.webNavigation = {
  onCompleted: { addListener: vi.fn() },
};
(globalThis as any).chrome.tabs.onActivated = { addListener: vi.fn() };
(globalThis as any).chrome.tabs.onRemoved = { addListener: vi.fn() };
(globalThis as any).chrome.runtime = {
  ...(globalThis as any).chrome.runtime,
  onInstalled: { addListener: vi.fn() },
  onStartup: { addListener: vi.fn() },
  onMessage: { addListener: vi.fn() },
};

import type { Menus, Tabs } from 'webextension-polyfill';
import { handleContextMenuClick, handleCommand } from '../entrypoints/background';
import { getToday } from '../components/storage';

describe('context menu capture', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
    mockStorageAPI.get.mockImplementation(async (keys?: string | string[]) => {
      if (!keys) return { ...mockStorage };
      if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
      const result: Record<string, any> = {};
      if (Array.isArray(keys)) {
        keys.forEach((key: string) => { result[key] = mockStorage[key]; });
      }
      return result;
    });
    mockStorageAPI.set.mockImplementation(async (items: Record<string, any>) => {
      Object.assign(mockStorage, items);
    });
  });

  it('captures the page URL when right-clicking the page', async () => {
    const info = {
      menuItemId: 'save-to-second-brain',
      pageUrl: 'https://example.com/article',
    } as Menus.OnClickData;
    const tab = { id: 1, url: 'https://example.com/article', title: 'Article' } as Tabs.Tab;

    await handleContextMenuClick(info, tab);

    const today = getToday();
    expect(mockStorage.captures[today]).toHaveLength(1);
    expect(mockStorage.captures[today][0].url).toBe('https://example.com/article');
    expect(mockStorage.captures[today][0].title).toBe('Article');
    expect(mockStorage.captures[today][0].source).toBe('manual');
  });

  it('captures the link URL when right-clicking a link', async () => {
    const info = {
      menuItemId: 'save-to-second-brain',
      linkUrl: 'https://linked-site.com/page',
      pageUrl: 'https://example.com',
    } as Menus.OnClickData;
    const tab = { id: 1, url: 'https://example.com', title: 'Example' } as Tabs.Tab;

    await handleContextMenuClick(info, tab);

    const today = getToday();
    expect(mockStorage.captures[today]).toHaveLength(1);
    expect(mockStorage.captures[today][0].url).toBe('https://linked-site.com/page');
    expect(mockStorage.captures[today][0].title).toBe('');
  });

  it('ignores non-http URLs', async () => {
    const info = {
      menuItemId: 'save-to-second-brain',
      pageUrl: 'chrome://extensions/',
    } as Menus.OnClickData;

    await handleContextMenuClick(info);

    expect(mockStorage.captures).toBeUndefined();
  });

  it('captures on blocked domains (bypasses blocklist)', async () => {
    const info = {
      menuItemId: 'save-to-second-brain',
      pageUrl: 'https://gmail.com/inbox',
    } as Menus.OnClickData;
    const tab = { id: 1, url: 'https://gmail.com/inbox', title: 'Gmail' } as Tabs.Tab;

    await handleContextMenuClick(info, tab);

    const today = getToday();
    expect(mockStorage.captures[today]).toHaveLength(1);
    expect(mockStorage.captures[today][0].domain).toBe('gmail.com');
    expect(mockStorage.captures[today][0].source).toBe('manual');
  });
});

describe('keyboard shortcut capture', () => {
  beforeEach(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
    vi.clearAllMocks();
    mockStorageAPI.get.mockImplementation(async (keys?: string | string[]) => {
      if (!keys) return { ...mockStorage };
      if (typeof keys === 'string') return { [keys]: mockStorage[keys] };
      const result: Record<string, any> = {};
      if (Array.isArray(keys)) {
        keys.forEach((key: string) => { result[key] = mockStorage[key]; });
      }
      return result;
    });
    mockStorageAPI.set.mockImplementation(async (items: Record<string, any>) => {
      Object.assign(mockStorage, items);
    });
  });

  it('captures active tab on save-current-page command', async () => {
    (globalThis as any).chrome.tabs.query.mockResolvedValue([
      { id: 1, url: 'https://example.com/page', title: 'Test Page' },
    ]);

    await handleCommand('save-current-page');

    const today = getToday();
    expect(mockStorage.captures[today]).toHaveLength(1);
    expect(mockStorage.captures[today][0].url).toBe('https://example.com/page');
    expect(mockStorage.captures[today][0].title).toBe('Test Page');
    expect(mockStorage.captures[today][0].source).toBe('manual');
  });

  it('ignores unrelated commands', async () => {
    await handleCommand('some-other-command');

    expect(mockStorage.captures).toBeUndefined();
    expect((globalThis as any).chrome.tabs.query).not.toHaveBeenCalled();
  });

  it('does nothing when active tab has no http URL', async () => {
    (globalThis as any).chrome.tabs.query.mockResolvedValue([
      { id: 1, url: 'chrome://settings', title: 'Settings' },
    ]);

    await handleCommand('save-current-page');

    expect(mockStorage.captures).toBeUndefined();
  });

  it('does nothing when no active tab exists', async () => {
    (globalThis as any).chrome.tabs.query.mockResolvedValue([]);

    await handleCommand('save-current-page');

    expect(mockStorage.captures).toBeUndefined();
  });
});
