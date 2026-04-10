import { z } from 'zod';

export const CaptureEntrySchema = z.object({
  url: z.string().url(),
  title: z.string(),
  domain: z.string(),
  timestamp: z.number(),
  source: z.enum(['live', 'backfill', 'manual']),
});
export type CaptureEntry = z.infer<typeof CaptureEntrySchema>;

export const PROCESSING_STATUSES = ['captured', 'content_fetched', 'curated', 'written'] as const;
export type ProcessingStatus = typeof PROCESSING_STATUSES[number];
