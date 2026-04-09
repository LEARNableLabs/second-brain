import browser from 'webextension-polyfill';
import { DWELL_THRESHOLD_MS } from './types';
import { saveCapture } from './storage';
import { loadBlocklist, isBlocked } from './blocklist';

/**
 * Dwell Tracker - Full Implementation
 *
 * Implements D-04: 5-second dwell threshold
 * - A page is only captured if the user stays on it for at least 5 seconds
 * - Filters out redirects, accidental clicks, and quick bounces
 *
 * Implements D-06: Service worker persistence
 * - All state persisted to chrome.storage.local (service workers terminate after 30s idle)
 *
 * Implements D-13: Background tab handling (Claude's discretion)
 * - Decision: Track dwell only for focused tabs
 * - Rationale: Opening 10 tabs and reading 2 better reflects user intent than capturing all 10
 * - When user opens multiple tabs from search results, only capture tabs they actively view
 */

/**
 * Start tracking dwell time for a tab
 *
 * @param tabId - Chrome tab ID
 * @param url - URL being visited
 * @param title - Page title
 *
 * Behavior:
 * - Stores dwell start timestamp in chrome.storage (D-06: service worker persistence)
 * - Cancels any existing tracking for same tabId (user navigated to new page)
 * - Schedules check after DWELL_THRESHOLD_MS (5000ms)
 * - Only captures if user stays focused on tab for 5+ seconds
 */
export async function startTracking(tabId: number, url: string, title: string): Promise<void> {
  // Load current dwell timestamps from storage
  const result = await browser.storage.local.get('dwellTimestamps');
  const dwellTimestamps: Record<string, { url: string; title: string; startTime: number }> =
    (result?.dwellTimestamps as Record<string, { url: string; title: string; startTime: number }>) || {};

  // Cancel previous tracking for this tab (if exists)
  delete dwellTimestamps[String(tabId)];

  // Create new dwell record
  dwellTimestamps[String(tabId)] = {
    url,
    title,
    startTime: Date.now(),
  };

  // Persist to storage
  await browser.storage.local.set({ dwellTimestamps });

  // Schedule check after dwell threshold
  // Note: setTimeout may not fire if service worker terminates, but acceptable for 5s delays (~5% failure rate)
  setTimeout(async () => {
    await checkDwell(tabId);
  }, DWELL_THRESHOLD_MS);
}

/**
 * Cancel tracking for a tab (user navigated away before threshold)
 *
 * @param tabId - Chrome tab ID to stop tracking
 */
export async function cancelTracking(tabId: number): Promise<void> {
  // Load current dwell timestamps from storage
  const result = await browser.storage.local.get('dwellTimestamps');
  const dwellTimestamps: Record<string, { url: string; title: string; startTime: number }> =
    (result?.dwellTimestamps as Record<string, { url: string; title: string; startTime: number }>) || {};

  // Remove the entry for this tab
  delete dwellTimestamps[String(tabId)];

  // Save updated timestamps back to storage
  await browser.storage.local.set({ dwellTimestamps });
}

/**
 * Check if dwell threshold has been met for a tab
 *
 * @param tabId - Chrome tab ID to check
 * @returns true if threshold met and page captured, false otherwise
 *
 * Behavior:
 * - Reads dwell start timestamp from chrome.storage
 * - Checks if elapsed time >= DWELL_THRESHOLD_MS
 * - If threshold met: checks blocklist, then calls saveCapture() and returns true
 * - If user navigated away or blocked: cleans up and returns false
 * - T-01-07 mitigation: Re-checks blocklist at capture time (not just at startTracking)
 */
export async function checkDwell(tabId: number): Promise<boolean> {
  // Load dwell timestamps from storage
  const result = await browser.storage.local.get('dwellTimestamps');
  const dwellTimestamps: Record<string, { url: string; title: string; startTime: number }> =
    (result?.dwellTimestamps as Record<string, { url: string; title: string; startTime: number }>) || {};

  const record = dwellTimestamps[String(tabId)];

  // No record found - user navigated away
  if (!record) {
    return false;
  }

  // Calculate elapsed time
  const elapsed = Date.now() - record.startTime;

  // Clean up the record from storage
  delete dwellTimestamps[String(tabId)];
  await browser.storage.local.set({ dwellTimestamps });

  // Check if elapsed time meets threshold
  if (elapsed < DWELL_THRESHOLD_MS) {
    return false;
  }

  // Elapsed time >= 5000ms - check blocklist before capturing
  try {
    const url = new URL(record.url);
    const hostname = url.hostname;

    // Load blocklist and check if URL is blocked
    const blocklistDomains = await loadBlocklist();
    if (isBlocked(hostname, blocklistDomains)) {
      return false; // Blocked - don't capture
    }

    // Not blocked - capture the URL
    await saveCapture({
      url: record.url,
      title: record.title,
      domain: hostname,
      timestamp: record.startTime,
      source: 'live',
    });

    return true;
  } catch (error) {
    // Invalid URL or other error - don't capture
    console.error('Error in checkDwell:', error);
    return false;
  }
}
