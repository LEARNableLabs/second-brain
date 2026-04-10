import { z } from 'zod';
import { CaptureEntrySchema } from './types.js';

// Schema for native messaging export response from extension
export const ExportResponseSchema = z.object({
  captures: z.record(z.string(), z.array(CaptureEntrySchema)),
  exportedAt: z.number(),
});
export type ExportResponse = z.infer<typeof ExportResponseSchema>;

// Re-export for convenience
export { CaptureEntrySchema } from './types.js';
