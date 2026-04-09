import browser from 'webextension-polyfill';
import { startTracking, cancelTracking } from '../components/dwell-tracker';
import { loadBlocklist, isBlocked, loadDefaultBlocklist, flattenBlocklist } from '../components/blocklist';

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
  details: chrome.webNavigation.WebNavigationFramedCallbackDetails
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
  activeInfo: chrome.tabs.TabActiveInfo
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
  removeInfo: chrome.tabs.TabRemoveInfo
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
 */
export async function handleInstall(
  details: chrome.runtime.InstalledDetails
): Promise<void> {
  try {
    if (details.reason === 'install') {
      // Load default blocklist from blocklist.json
      const blocklistConfig = await loadDefaultBlocklist();
      const flattened = flattenBlocklist(blocklistConfig);

      // Save to storage
      await browser.storage.local.set({ blocklist: flattened });

      console.log('Second Brain Capture: Default blocklist initialized');
    }
  } catch (error) {
    console.error('Error in handleInstall:', error);
  }
}

/**
 * Handle browser startup event (runtime.onStartup)
 * D-02: Reset isPaused to false (pause is temporary)
 */
export async function handleStartup(): Promise<void> {
  try {
    // Reset pause state on browser startup
    await browser.storage.local.set({ isPaused: false });
    console.log('Second Brain Capture: Service worker started, pause state reset');
  } catch (error) {
    console.error('Error in handleStartup:', error);
  }
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
});
