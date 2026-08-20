import browser from 'webextension-polyfill';
import type { WebNavigation, Tabs, Runtime, Menus } from 'webextension-polyfill';
import { startTracking, cancelTracking } from '../components/dwell-tracker';
import { loadBlocklist, isBlocked, loadDefaultBlocklist, flattenBlocklist } from '../components/blocklist';
import { detectGap, backfillHistory } from '../components/history-backfill';
import { loadStorage, saveStorage, saveManualCapture } from '../components/storage';
import { createModuleLogger } from '../components/logger';
import type { CaptureEntry } from '../components/types';

const logger = createModuleLogger('background');

/**
 * Background Service Worker - Event-Driven Capture Engine
 *
 * CRITICAL MV3 REQUIREMENTS:
 * - All event listeners registered synchronously at top level
 * - No DOM access (document, window, chrome.runtime.getBackgroundPage())
 * - All state persisted to chrome.storage.local (service worker terminates after 30s idle)
 *
 * Implements:
 * - D-04: 5-second dwell threshold via dwell-tracker
 * - D-13: Background tab handling (track only focused tabs)
 * - D-02: Pause is temporary (reset on browser startup)
 * - T-01-05 mitigation: Filter chrome://, about://, extension:// URLs
 */

/**
 * Handle page load event (webNavigation.onCompleted)
 * Start dwell tracking for qualifying pages
 */
export async function handlePageLoad(
  details: WebNavigation.OnCompletedDetailsType
): Promise<void> {
  // Only process main frame (not iframes)
  if (details.frameId !== 0) return;

  // Filter out non-http URLs (T-01-05: Information Disclosure mitigation)
  if (!details.url.startsWith('http://') && !details.url.startsWith('https://')) {
    return;
  }

  try {
    // Load pause state from storage
    const { isPaused } = await browser.storage.local.get('isPaused');
    if (isPaused) return; // User paused capture

    // Parse URL
    const url = new URL(details.url);

    // Load blocklist and check if domain is blocked
    const blocklistDomains = await loadBlocklist();
    if (isBlocked(url.hostname, blocklistDomains)) {
      return; // Blocked domain
    }

    // D-13: Check if tab is active tab in its window (background tabs not captured until focused)
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    const activeTab = tabs.find((tab) => tab.id === details.tabId);
    if (!activeTab) {
      return; // Tab is not active - handleTabActivated will catch it on focus
    }

    // Get tab details for title
    const tab = await browser.tabs.get(details.tabId);
    const title = tab.title || '';

    // Start dwell tracking
    await startTracking(details.tabId, details.url, title);
  } catch (error) {
    console.error('Error in handlePageLoad:', error);
  }
}

/**
 * Handle tab activation event (tabs.onActivated)
 * D-13: Track dwell when user focuses a tab
 */
export async function handleTabActivated(
  activeInfo: Tabs.OnActivatedActiveInfoType
): Promise<void> {
  try {
    // Load pause state
    const { isPaused } = await browser.storage.local.get('isPaused');
    if (isPaused) return;

    // Get tab details
    const tab = await browser.tabs.get(activeInfo.tabId);
    if (!tab.url) return;

    // Filter out non-http URLs
    if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
      return;
    }

    // Parse URL
    const url = new URL(tab.url);

    // Load blocklist and check if domain is blocked
    const blocklistDomains = await loadBlocklist();
    if (isBlocked(url.hostname, blocklistDomains)) {
      return;
    }

    // Start dwell tracking for newly focused tab
    await startTracking(tab.id!, tab.url, tab.title || '');
  } catch (error) {
    console.error('Error in handleTabActivated:', error);
  }
}

/**
 * Handle tab removed event (tabs.onRemoved)
 * Cancel pending dwell tracking for closed tab (T-01-06 mitigation: prevent storage leak)
 */
export async function handleTabRemoved(
  tabId: number,
  _removeInfo: Tabs.OnRemovedRemoveInfoType
): Promise<void> {
  try {
    // Cancel any pending dwell tracking for this tab
    await cancelTracking(tabId);
  } catch (error) {
    console.error('Error in handleTabRemoved:', error);
  }
}

/**
 * Handle extension install event (runtime.onInstalled)
 * Initialize default blocklist on first install
 * Backfill history on extension update
 */
export async function handleInstall(
  details: Runtime.OnInstalledDetailsType
): Promise<void> {
  try {
    // Register context menus once on install/update (not on every SW restart)
    browser.contextMenus.create({
      id: 'save-to-second-brain',
      title: 'Save to Second Brain',
      contexts: ['page', 'link'],
    });

    if (details.reason === 'install') {
      // Load default blocklist from blocklist.json
      const blocklistConfig = await loadDefaultBlocklist();
      const flattened = flattenBlocklist(blocklistConfig);

      // Save to storage
      await browser.storage.local.set({ blocklist: flattened });

      console.log('Second Brain Capture: Default blocklist initialized');
    }

    if (details.reason === 'update') {
      // Backfill any gaps from when extension was disabled/updating
      const gapStart = await detectGap();
      if (gapStart !== null) {
        await backfillHistory(gapStart);
      }
    }
  } catch (error) {
    console.error('Error in handleInstall:', error);
  }
}

/**
 * Handle browser startup event (runtime.onStartup)
 * D-02: Reset isPaused to false (pause is temporary)
 * D-11: Auto-detect gaps and backfill from history on startup
 */
export async function handleStartup(): Promise<void> {
  try {
    // Reset pause state on browser startup
    await browser.storage.local.set({ isPaused: false });
    console.log('Second Brain Capture: Service worker started, pause state reset');

    // D-11: Auto-detect gaps and backfill from history on startup
    const gapStart = await detectGap();
    if (gapStart !== null) {
      const count = await backfillHistory(gapStart);
      console.log(`Second Brain Capture: backfilled ${count} entries from gap starting at ${new Date(gapStart).toISOString()}`);
    }
  } catch (error) {
    console.error('Error in handleStartup:', error);
  }
}

/**
 * Capture the active tab as a manual save, bypassing the blocklist.
 * Shared by context menu and keyboard shortcut handlers.
 */
async function captureActiveTab(): Promise<boolean> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
    return false;
  }
  const url = new URL(tab.url);
  return saveManualCapture(tab.url, tab.title || '', url.hostname);
}

/**
 * Handle context menu click — save the target page or link URL.
 */
export async function handleContextMenuClick(
  info: Menus.OnClickData,
  tab?: Tabs.Tab
): Promise<void> {
  try {
    const targetUrl = info.linkUrl || info.pageUrl;
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return;
    }
    const url = new URL(targetUrl);
    const title = (info.linkUrl ? '' : tab?.title) || '';
    await saveManualCapture(targetUrl, title, url.hostname);
    logger.info({ url: targetUrl, source: 'context-menu' }, 'manual capture saved');
  } catch (error) {
    logger.error({ error: String(error) }, 'error in handleContextMenuClick');
  }
}

/**
 * Handle keyboard shortcut command.
 */
export async function handleCommand(command: string): Promise<void> {
  if (command !== 'save-current-page') return;
  try {
    const saved = await captureActiveTab();
    if (saved) {
      logger.info({ source: 'keyboard-shortcut' }, 'manual capture saved');
    }
  } catch (error) {
    logger.error({ error: String(error) }, 'error in handleCommand');
  }
}

/**
 * Handle export request: return all captures from chrome.storage
 * D-03: Mark captures with exportedAt timestamp for 7-day retention tracking
 */
export async function handleGetCaptures(): Promise<{
  captures: Record<string, CaptureEntry[]>;
  exportedAt: number;
}> {
  const state = await loadStorage();
  const captures = state.captures || {};
  const exportedAt = Date.now();

  // D-03: Store export timestamp for 7-day retention tracking
  // Clean up entries older than 7 days since last export
  const sevenDaysAgo = exportedAt - (7 * 24 * 60 * 60 * 1000);
  const retainedCaptures: Record<string, CaptureEntry[]> = {};
  for (const [dateKey, entries] of Object.entries(captures)) {
    // Parse date key to check age
    const dateMs = new Date(dateKey + 'T00:00:00').getTime();
    if (dateMs >= sevenDaysAgo) {
      retainedCaptures[dateKey] = entries;
    }
  }

  // Save cleaned captures and export timestamp back to storage
  await saveStorage({
    captures: retainedCaptures,
    lastExportTimestamp: exportedAt,
  } as any); // lastExportTimestamp is new -- extend StorageState in future cleanup

  return { captures, exportedAt };
}

/**
 * Service worker entrypoint
 * CRITICAL: All event listeners MUST be registered synchronously at top level
 */
export default defineBackground(() => {
  console.log('Second Brain Capture: service worker initialized');

  // Register all event listeners synchronously
  browser.webNavigation.onCompleted.addListener(handlePageLoad);
  browser.tabs.onActivated.addListener(handleTabActivated);
  browser.tabs.onRemoved.addListener(handleTabRemoved);
  browser.runtime.onInstalled.addListener(handleInstall);
  browser.runtime.onStartup.addListener(handleStartup);

  // Context menu click handler (menu items registered in handleInstall)
  browser.contextMenus.onClicked.addListener(handleContextMenuClick);

  // Keyboard shortcut handler
  browser.commands.onCommand.addListener(handleCommand);

  // Handle messages from native messaging host (Phase 2: Data Export Pipeline)
  // The CLI triggers export by launching the native host, which sends a message to the extension.
  // Extension responds with current captures from chrome.storage.
  browser.runtime.onMessage.addListener(async (message: unknown) => {
    if ((message as { action?: string }).action === 'getCaptures') {
      try {
        return await handleGetCaptures();
      } catch (err) {
        console.error('Error handling getCaptures:', err);
        return { error: String(err) };
      }
    }
  });

  // D-11: Run backfill on every service worker init (covers re-enable, update, startup)
  // onStartup only fires on browser launch; this catches extension disable/re-enable too
  detectGap().then((gapStart) => {
    if (gapStart !== null) {
      backfillHistory(gapStart).then((count) => {
        console.log(`Second Brain Capture: backfilled ${count} entries`);
      });
    }
  }).catch((err) => {
    console.error('Second Brain Capture: backfill error', err);
  });
});
