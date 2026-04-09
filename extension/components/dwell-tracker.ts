import { DwellRecord, DWELL_THRESHOLD_MS } from './types';

/**
 * Dwell Tracker - Stub Implementation
 *
 * Full implementation in Plan 03 (Capture Engine).
 *
 * Implements D-04: 5-second dwell threshold
 * - A page is only captured if the user stays on it for at least 5 seconds
 * - Filters out redirects, accidental clicks, and quick bounces
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
 * - Schedules check after DWELL_THRESHOLD_MS (5000ms)
 * - Only captures if user stays focused on tab for 5+ seconds
 */
export async function startTracking(tabId: number, url: string, title: string): Promise<void> {
  // Stub implementation - full logic in Plan 03
  console.log(`[Stub] startTracking: tabId=${tabId}, url=${url}, title=${title}`);
}

/**
 * Cancel tracking for a tab (user navigated away before threshold)
 *
 * @param tabId - Chrome tab ID to stop tracking
 */
export async function cancelTracking(tabId: number): Promise<void> {
  // Stub implementation - full logic in Plan 03
  console.log(`[Stub] cancelTracking: tabId=${tabId}`);
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
 * - If threshold met: calls saveCapture() and returns true
 * - If user navigated away: cleans up and returns false
 */
export async function checkDwell(tabId: number): Promise<boolean> {
  // Stub implementation - full logic in Plan 03
  console.log(`[Stub] checkDwell: tabId=${tabId}`);
  return false;
}
