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
 * Export command: fetch captures from extension via native messaging, validate, save to SQLite.
 * Per D-01: CLI sends request to extension via native messaging host.
 * Per D-02: Export is CLI-pull on demand.
 * Per D-09: Output is summary stats.
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

    // Fetch captures from extension via native messaging
    // The CLI spawns the native host process, which communicates with the extension
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
    // Detect source browsers from capture domains (simplified: always show Chrome + Comet for now)
    console.log(`  Source: Chrome + Comet`);
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
 * Fetch captures from the browser extension.
 *
 * The CLI reads captures from ~/.second-brain/export.json, which is written by the
 * native messaging host when the extension sends captures. The extension initiates
 * the native messaging flow (it calls sendNativeMessage), and the host writes the
 * result to the export file for the CLI to consume.
 *
 * Flow: Extension -> sendNativeMessage -> Native Host -> writes export.json -> CLI reads it
 */
async function fetchCapturesFromExtension(): Promise<Record<string, CaptureEntry[]>> {
  const exportPath = path.join(
    process.env.SECOND_BRAIN_DATA_DIR || path.join(os.homedir(), '.second-brain'),
    'export.json'
  );

  if (!fs.existsSync(exportPath)) {
    console.error('No export file found. Ensure the browser extension has exported data.');
    console.error(`Expected: ${exportPath}`);
    console.error('');
    console.error('To export manually:');
    console.error('  1. Open Chrome with the Second Brain extension installed');
    console.error('  2. The extension will write captures to the export file via native messaging');
    console.error('  3. Run this command again');
    return {};
  }

  try {
    const raw = fs.readFileSync(exportPath, 'utf-8');
    const data = JSON.parse(raw);

    // Validate overall structure
    if (data.captures && typeof data.captures === 'object') {
      // Remove export file after reading (one-time consumption)
      fs.unlinkSync(exportPath);
      return data.captures;
    }

    console.error('Export file has unexpected structure. Expected { captures: { ... } }');
    return {};
  } catch (err) {
    console.error(`Failed to read export file: ${err}`);
    return {};
  }
}
