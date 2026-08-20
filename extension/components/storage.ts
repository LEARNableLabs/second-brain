import browser from 'webextension-polyfill';
import { CaptureEntry, CaptureEntrySchema, StorageState, StorageStateSchema } from './types';
import { createModuleLogger } from './logger';

const logger = createModuleLogger('storage');

/**
 * Load storage state with Zod validation
 * Validates data from chrome.storage and provides defaults for missing fields
 * Mitigates T-01-02: Tampering via corrupted storage data
 */
export async function loadStorage(): Promise<StorageState> {
  logger.debug('loading storage state');
  const raw = await browser.storage.local.get();

  // Validate and provide defaults via Zod schema
  const parsed = StorageStateSchema.parse(raw);
  return parsed;
}

/**
 * Save partial storage state
 * Updates only the specified fields in chrome.storage.local
 */
export async function saveStorage(data: Partial<StorageState>): Promise<void> {
  logger.debug('saving storage state');
  await browser.storage.local.set(data);
}

/**
 * Get today's key in YYYY-MM-DD format (local timezone)
 */
export function getToday(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Save a captured URL to today's captures
 * Implements D-05: URL deduplication per day
 * @returns true if saved, false if already exists (duplicate)
 */
export async function saveCapture(entry: CaptureEntry): Promise<boolean> {
  logger.info({ url: entry.url }, 'saving capture');
  const today = getToday();
  const result = await browser.storage.local.get('captures');
  const captures: Record<string, CaptureEntry[]> = (result.captures as Record<string, CaptureEntry[]>) || {};

  if (!captures[today]) {
    captures[today] = [];
  }

  // D-05: Deduplicate by URL (first visit timestamp kept)
  const exists = captures[today].find((c: CaptureEntry) => c.url === entry.url);
  if (exists) {
    return false; // Already captured today
  }

  // Validate entry before saving
  const validated = CaptureEntrySchema.parse(entry);
  captures[today].push(validated);

  await browser.storage.local.set({
    captures,
    lastCaptureTimestamp: entry.timestamp,
  });

  return true;
}

/**
 * Save a manual capture, bypassing blocklist.
 * D-06: If URL already captured today as 'live' or 'backfill', upgrade source to 'manual'.
 * @returns true if saved or upgraded, false on error
 */
export async function saveManualCapture(url: string, title: string, domain: string): Promise<boolean> {
  logger.info({ url }, 'saving manual capture');
  const today = getToday();
  const result = await browser.storage.local.get('captures');
  const captures: Record<string, CaptureEntry[]> = (result.captures as Record<string, CaptureEntry[]>) || {};

  if (!captures[today]) {
    captures[today] = [];
  }

  // Check if already captured today — upgrade to 'manual' if so
  const existing = captures[today].find((c: CaptureEntry) => c.url === url);
  if (existing) {
    existing.source = 'manual';
    await browser.storage.local.set({
      captures,
      lastCaptureTimestamp: Date.now(),
    });
    return true;
  }

  // New manual capture
  const entry: CaptureEntry = {
    url,
    title,
    domain,
    timestamp: Date.now(),
    source: 'manual',
  };

  const validated = CaptureEntrySchema.parse(entry);
  captures[today].push(validated);

  await browser.storage.local.set({
    captures,
    lastCaptureTimestamp: Date.now(),
  });

  return true;
}

/**
 * Get count of captures for today
 */
export async function getTodayCount(): Promise<number> {
  logger.debug('getting today count');
  const today = getToday();
  const result = await browser.storage.local.get('captures');
  const captures: Record<string, CaptureEntry[]> = (result.captures as Record<string, CaptureEntry[]>) || {};
  return captures[today]?.length || 0;
}

/**
 * Get the most recent capture entry
 */
export async function getLastCapture(): Promise<CaptureEntry | null> {
  logger.debug('getting last capture');
  const today = getToday();
  const result = await browser.storage.local.get('captures');
  const captures: Record<string, CaptureEntry[]> = (result.captures as Record<string, CaptureEntry[]>) || {};
  const todayCaptures = captures[today];

  if (!todayCaptures || todayCaptures.length === 0) {
    return null;
  }

  return todayCaptures[todayCaptures.length - 1];
}
