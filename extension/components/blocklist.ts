import browser from 'webextension-polyfill';
import { BlocklistConfig, BlocklistConfigSchema } from './types';

/**
 * Check if a hostname matches the blocklist
 * Implements D-07: Subdomain matching (blocking "google.com" blocks all *.google.com)
 * @param hostname - The hostname to check (e.g., "mail.google.com")
 * @param blocklist - Array of blocked domain patterns
 * @returns true if blocked, false otherwise
 */
export function isBlocked(hostname: string, blocklist: string[]): boolean {
  // Normalize hostname to lowercase
  const normalized = hostname.toLowerCase();

  for (const pattern of blocklist) {
    const normalizedPattern = pattern.toLowerCase();

    // Exact match: google.com === google.com
    if (normalized === normalizedPattern) {
      return true;
    }

    // Subdomain match: mail.google.com ends with ".google.com"
    // This prevents "notgoogle.com" from matching "google.com"
    if (normalized.endsWith('.' + normalizedPattern)) {
      return true;
    }
  }

  return false;
}

/**
 * Load the default blocklist from public/blocklist.json
 * Mitigates T-01-03: Validates blocklist.json structure, falls back to defaults on error
 */
export async function loadDefaultBlocklist(): Promise<BlocklistConfig> {
  try {
    const response = await fetch(browser.runtime.getURL('blocklist.json'));
    const data = await response.json();

    // Validate structure with Zod schema
    const validated = BlocklistConfigSchema.parse(data);
    return validated;
  } catch (error) {
    console.error('Failed to load default blocklist:', error);

    // Fallback to hardcoded defaults if blocklist.json is missing or invalid
    return {
      google: ['google.com'],
      banking: ['bankofamerica.com'],
      social: ['twitter.com'],
      auth: ['localhost'],
      custom: [],
    };
  }
}

/**
 * Flatten blocklist config into a single array of domain patterns
 * Merges all categories (google, banking, social, auth, custom) into one flat list
 */
export function flattenBlocklist(config: BlocklistConfig): string[] {
  return [
    ...config.google,
    ...config.banking,
    ...config.social,
    ...config.auth,
    ...config.custom,
  ];
}

/**
 * Load the flattened blocklist from chrome.storage
 * If not initialized, loads default blocklist from blocklist.json
 */
export async function loadBlocklist(): Promise<string[]> {
  const result = await browser.storage.local.get('blocklist');
  const blocklist = result.blocklist as string[] | undefined;

  // If blocklist not initialized, load and flatten defaults
  if (!blocklist || blocklist.length === 0) {
    const defaultConfig = await loadDefaultBlocklist();
    const flattened = flattenBlocklist(defaultConfig);

    // Save to storage for future use
    await browser.storage.local.set({ blocklist: flattened });
    return flattened;
  }

  return blocklist;
}

/**
 * Add a domain to the blocklist
 * Implements D-03: Quick-block button adds current tab's domain
 * Implements D-09: Writes to chrome.storage (JSON file editing handled in Phase 2)
 */
export async function addToBlocklist(domain: string): Promise<void> {
  const result = await browser.storage.local.get('blocklist');
  const blocklist: string[] = (result.blocklist as string[]) || [];

  // Normalize domain to lowercase
  const normalized = domain.toLowerCase();

  // Avoid duplicates
  if (!blocklist.includes(normalized)) {
    blocklist.push(normalized);
    await browser.storage.local.set({ blocklist });
  }
}

/**
 * Remove a domain from the blocklist
 */
export async function removeFromBlocklist(domain: string): Promise<void> {
  const result = await browser.storage.local.get('blocklist');
  const blocklist: string[] = (result.blocklist as string[]) || [];

  const normalized = domain.toLowerCase();
  const updated = blocklist.filter((d: string) => d !== normalized);

  await browser.storage.local.set({ blocklist: updated });
}
