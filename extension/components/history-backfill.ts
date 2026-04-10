import browser from 'webextension-polyfill';
import { BACKFILL_MAX_LOOKBACK_DAYS, BACKFILL_MAX_RESULTS, CaptureEntry } from './types';
import { loadStorage, saveStorage, getToday } from './storage';
import { isBlocked } from './blocklist';

/**
 * History Backfill - Full Implementation
 *
 * Implements D-11: Gap detection on extension startup
 * - Compares last captured timestamp against browser history
 * - Silently backfills missing entries from chrome.history API
 * - Runs automatically when extension starts or is re-enabled
 *
 * Implements D-14: Lookback window (Claude's discretion)
 * - Decision: 7-day max lookback window (BACKFILL_MAX_LOOKBACK_DAYS)
 * - Rationale: Balances completeness vs performance
 * - Prevents performance issues from scanning months of history
 * - Max 1000 results (BACKFILL_MAX_RESULTS) to avoid quota limits
 *
 * Implements D-12: Backfilled entries are marked
 * - source: 'backfill' (vs 'live') in CaptureEntry
 * - Daily note UI will distinguish backfilled entries (italic or suffix)
 */

// Gap threshold: 5 minutes (shorter gaps are normal service worker sleep)
const GAP_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Detect if there's a gap between last capture and current time
 *
 * @returns lastCaptureTimestamp if gap detected, null otherwise
 *
 * Behavior:
 * - Reads lastCaptureTimestamp from chrome.storage
 * - Compares against current time
 * - Returns null if first run (lastCaptureTimestamp === 0)
 * - Returns null if elapsed time <= GAP_THRESHOLD_MS (5 minutes)
 * - Returns lastCaptureTimestamp if gap > 5 minutes
 */
export async function detectGap(): Promise<number | null> {
  const storage = await loadStorage();
  const { lastCaptureTimestamp } = storage;

  const now = Date.now();

  // First run — backfill last 24 hours of history
  if (lastCaptureTimestamp === 0) {
    return now - (24 * 60 * 60 * 1000);
  }

  const elapsed = now - lastCaptureTimestamp;

  // No gap - recent capture
  if (elapsed <= GAP_THRESHOLD_MS) {
    return null;
  }

  // Gap detected
  return lastCaptureTimestamp;
}

/**
 * Backfill history entries from a detected gap
 *
 * @param gapStartTimestamp - Start timestamp of gap (milliseconds)
 * @returns Count of entries backfilled
 *
 * Behavior:
 * - Queries chrome.history.search() for the gap period
 * - Filters by blocklist (same as live capture)
 * - Deduplicates by URL per day (D-05)
 * - Marks entries with source: 'backfill' (D-12)
 * - Respects BACKFILL_MAX_RESULTS limit (1000 entries)
 * - Updates lastCaptureTimestamp after backfill completes
 * - Caps lookback at BACKFILL_MAX_LOOKBACK_DAYS (7 days)
 */
export async function backfillHistory(gapStartTimestamp: number): Promise<number> {
  const storage = await loadStorage();
  const { captures, blocklist } = storage;

  const now = Date.now();

  // Cap lookback at 7 days (D-14)
  const maxLookback = now - (BACKFILL_MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const startTime = Math.max(gapStartTimestamp, maxLookback);

  // Query browser history for the gap period
  const historyItems = await browser.history.search({
    text: '',
    startTime,
    endTime: now,
    maxResults: BACKFILL_MAX_RESULTS,
  });

  let backfillCount = 0;

  // Process each history item
  for (const item of historyItems) {
    // Skip items without URL (should not happen, but defensive)
    if (!item.url) {
      continue;
    }

    // Filter non-http URLs (chrome://, about://, etc.) - T-01-13
    if (!item.url.startsWith('http://') && !item.url.startsWith('https://')) {
      continue;
    }

    // Parse hostname with error handling - T-01-14
    let hostname: string;
    try {
      const url = new URL(item.url);
      hostname = url.hostname;
    } catch (error) {
      // Malformed URL - skip
      continue;
    }

    // Check blocklist - T-01-12
    if (isBlocked(hostname, blocklist)) {
      continue;
    }

    // Create capture entry with source: 'backfill' (D-12)
    const entry: CaptureEntry = {
      url: item.url,
      title: item.title || hostname,
      domain: hostname,
      timestamp: item.lastVisitTime || gapStartTimestamp,
      source: 'backfill',
    };

    // Deduplicate per day (D-05) — use local date to match getToday()
    const d = new Date(entry.timestamp);
    const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    if (!captures[dayKey]) {
      captures[dayKey] = [];
    }

    const exists = captures[dayKey].find((c: CaptureEntry) => c.url === entry.url);
    if (!exists) {
      captures[dayKey].push(entry);
      backfillCount++;
    }
  }

  // Update storage with backfilled entries and new lastCaptureTimestamp
  await saveStorage({
    captures,
    lastCaptureTimestamp: now,
  });

  return backfillCount;
}
