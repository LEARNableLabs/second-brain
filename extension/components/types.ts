import { z } from 'zod';

// === Capture Entry ===
export const CaptureEntrySchema = z.object({
  url: z.string().url(),
  title: z.string(),
  domain: z.string(),
  timestamp: z.number(),
  source: z.enum(['live', 'backfill', 'manual']),
});
export type CaptureEntry = z.infer<typeof CaptureEntrySchema>;

// === Dwell Record ===
export interface DwellRecord {
  url: string;
  title: string;
  tabId: number;
  startTime: number;
}

// === Blocklist Config ===
export const BlocklistConfigSchema = z.object({
  google: z.array(z.string()),
  banking: z.array(z.string()),
  social: z.array(z.string()),
  auth: z.array(z.string()),
  custom: z.array(z.string()).default([]),
});
export type BlocklistConfig = z.infer<typeof BlocklistConfigSchema>;

// === Storage Schema ===
export const StorageStateSchema = z.object({
  isPaused: z.boolean().default(false),
  blocklist: z.array(z.string()).default([]),
  captures: z.record(z.string(), z.array(CaptureEntrySchema)).default({}),
  lastCaptureTimestamp: z.number().default(0),
  dwellTimestamps: z.record(z.string(), z.object({
    url: z.string(),
    title: z.string(),
    startTime: z.number(),
  })).default({}),
});
export type StorageState = z.infer<typeof StorageStateSchema>;

// === Constants ===
export const DWELL_THRESHOLD_MS = 5000;
export const BACKFILL_MAX_LOOKBACK_DAYS = 7;
export const BACKFILL_MAX_RESULTS = 1000;
export const TODAY_KEY_FORMAT = 'YYYY-MM-DD';
