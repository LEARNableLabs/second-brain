import { getDatabase, closeDatabase, getDatabasePath } from '../db/connection.js';
import { migrate, getSchemaVersion } from '../db/migrate.js';
import { saveCaptures } from '../db/operations.js';
import { CaptureEntrySchema } from '@second-brain/shared/schemas';
import type { CaptureEntry } from '@second-brain/shared';
import { createRequestLogger } from '@second-brain/shared/logger';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import os from 'os';

interface ExportOptions {
  dryRun?: boolean;
}

/**
 * Import a legacy capture snapshot. Current extensions sync directly to SQLite.
 */
export async function exportCommand(options: ExportOptions = {}): Promise<void> {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger('cmd:export', requestId);
  logger.info({ requestId }, 'export command started');
  const db = getDatabase();

  try {
    // Run migrations
    const { applied, current } = migrate(db);
    if (applied > 0) {
      logger.info({ applied, current }, 'applied migrations');
      console.error(`Applied ${applied} migration(s). Schema now at v${current}.`);
    }

    // Read an optional legacy snapshot.
    const captures = await fetchCapturesFromExtension();

    if (!captures || Object.keys(captures).length === 0) {
      console.log('No captures to export.');
      console.log(`  Database: ${getDatabasePath()}`);
      console.log(`  Schema: v${getSchemaVersion(db)}`);
      return;
    }

    // Flatten day-keyed captures into array
    const allEntries: CaptureEntry[] = [];
    let invalidCount = 0;

    for (const [dateKey, entries] of Object.entries(captures)) {
      for (const entry of entries as any[]) {
        const result = CaptureEntrySchema.safeParse(entry);
        if (result.success) {
          allEntries.push(result.data);
        } else {
          invalidCount++;
          console.error(`Invalid entry skipped: ${JSON.stringify(entry).substring(0, 100)}`);
        }
      }
    }

    if (invalidCount > 0) {
      console.error(`Warning: ${invalidCount} invalid entries skipped during validation.`);
    }

    if (options.dryRun) {
      console.log(`[DRY RUN] Would export ${allEntries.length} captures`);
      return;
    }

    // Save to database (handles deduplication via UNIQUE constraint)
    const { inserted, skipped } = saveCaptures(db, allEntries);
    const manualCount = allEntries.filter(e => e.source === 'manual').length;

    // D-09: Summary stats output
    console.log(`Exported ${allEntries.length} captures (${inserted} new, ${skipped} existing)`);
    if (manualCount > 0) {
      console.log(`  ⭐ ${manualCount} manual saves`);
    }
    console.log(`  Database: ${getDatabasePath()}`);
    console.log(`  Schema: v${getSchemaVersion(db)}`);

  } catch (err) {
    logger.error({ err }, 'export failed');
    console.error('Export failed:', err);
    process.exitCode = 1;
  } finally {
    logger.info('export command finished');
    closeDatabase(db);
  }
}

/**
 * Read a legacy export.json without deleting the retryable source snapshot.
 */
async function fetchCapturesFromExtension(): Promise<Record<string, CaptureEntry[]>> {
  const exportPath = path.join(
    process.env.SECOND_BRAIN_DATA_DIR || path.join(os.homedir(), '.second-brain'),
    'export.json'
  );

  if (!fs.existsSync(exportPath)) {
    console.error('No export file found. Current extensions sync directly to the database.');
    console.error('Open the extension popup and select Sync now to verify the connection.');
    return {};
  }

  try {
    const raw = fs.readFileSync(exportPath, 'utf-8');
    const data = JSON.parse(raw);

    // Validate overall structure
    if (data.captures && typeof data.captures === 'object') {
      // Keep the snapshot for retries and dry runs. Database imports are idempotent.
      if (Array.isArray(data.captures) || Object.values(data.captures).some(entries => !Array.isArray(entries))) {
        throw new Error('Each capture date must contain an array');
      }
      return data.captures;
    }

    throw new Error('Export file has unexpected structure. Expected { captures: { ... } }');
  } catch (err) {
    throw new Error(`Failed to read export file: ${err}`);
  }
}
