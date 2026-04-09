import { BACKFILL_MAX_LOOKBACK_DAYS, BACKFILL_MAX_RESULTS } from './types';

/**
 * History Backfill - Stub Implementation
 *
 * Full implementation in Plan 05 (History Backfill).
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

/**
 * Detect if there's a gap between last capture and current time
 *
 * @returns Object with gap details: { hasGap: boolean, gapStart: number, gapEnd: number }
 *
 * Behavior:
 * - Reads lastCaptureTimestamp from chrome.storage
 * - Compares against current time
 * - Returns gap period if delta > threshold (e.g., 1 hour)
 * - Caps lookback at BACKFILL_MAX_LOOKBACK_DAYS (7 days)
 */
export async function detectGap(): Promise<{
  hasGap: boolean;
  gapStart: number;
  gapEnd: number;
}> {
  // Stub implementation - full logic in Plan 05
  console.log('[Stub] detectGap: checking for capture gaps');

  return {
    hasGap: false,
    gapStart: 0,
    gapEnd: 0,
  };
}

/**
 * Backfill history entries from a detected gap
 *
 * @param gapStart - Start timestamp of gap (milliseconds)
 * @param gapEnd - End timestamp of gap (milliseconds)
 * @returns Count of entries backfilled
 *
 * Behavior:
 * - Queries chrome.history.search() for the gap period
 * - Filters by blocklist (same as live capture)
 * - Deduplicates by URL per day (D-05)
 * - Marks entries with source: 'backfill' (D-12)
 * - Respects BACKFILL_MAX_RESULTS limit (1000 entries)
 * - Updates lastCaptureTimestamp after backfill completes
 */
export async function backfillHistory(gapStart: number, gapEnd: number): Promise<number> {
  // Stub implementation - full logic in Plan 05
  console.log(`[Stub] backfillHistory: gapStart=${gapStart}, gapEnd=${gapEnd}`);

  return 0;
}
