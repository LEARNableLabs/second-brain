import pLimit from 'p-limit';
import { localDate, parseDate } from '../config/date.js';
import { getDatabase, closeDatabase } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { getByDate, updateStatus } from '../db/operations.js';
import { saveContent, saveContentError } from '../db/content-operations.js';
import { extractContent } from '../extractors/strategy.js';

interface FetchOptions {
  date?: string;
  dry?: boolean;
}

const CONCURRENCY = 5;
const ARXIV_DELAY_MS = 3000;

export async function fetchCommand(options: FetchOptions = {}): Promise<void> {
  const date = options.date ? parseDate(options.date) : localDate();
  console.error(`Fetching content for ${date}...`);

  const db = getDatabase();
  try {
    const { applied } = migrate(db);
    if (applied > 0) {
      console.error(`Applied ${applied} migration(s).`);
    }

    // Get captures that have been written to daily note but not yet content-fetched
    const captures = getByDate(db, date).filter(c =>
      (c.status === 'written' || c.status === 'captured') && /^https?:\/\//.test(c.url));
    if (captures.length === 0) {
      console.error(`No web captures awaiting content for ${date}`);
      return;
    }

    console.error(`Found ${captures.length} captures to fetch content for`);

    if (options.dry) {
      for (const capture of captures) {
        console.log(`[dry] Would fetch: ${capture.url} (${capture.domain})`);
      }
      console.error(`\n${captures.length} URLs would be fetched`);
      return;
    }

    const limit = pLimit(CONCURRENCY);
    let succeeded = 0;
    let failed = 0;
    let nextArxivTime = 0;

    const tasks = captures.map(capture =>
      limit(async () => {
        // Rate limit arxiv requests
        if (capture.domain === 'arxiv.org' || capture.domain.endsWith('.arxiv.org')) {
          const scheduled = Math.max(Date.now(), nextArxivTime);
          nextArxivTime = scheduled + ARXIV_DELAY_MS;
          const delay = scheduled - Date.now();
          if (delay > 0) await new Promise(r => setTimeout(r, delay));
        }

        try {
          const content = await extractContent(capture.url);
          saveContent(db, capture.url, date, content);
          updateStatus(db, capture.url, date, 'content_fetched');
          succeeded++;
          console.error(`  ✓ ${capture.domain} — ${content.contentType} (${content.wordCount} words)`);
        } catch (err: any) {
          const errorMsg = err.message || String(err);
          saveContentError(db, capture.url, date, errorMsg);
          failed++;
          console.error(`  ✗ ${capture.domain} — ${errorMsg}`);
        }
      })
    );

    const results = await Promise.allSettled(tasks);
    const rejected = results.filter(result => result.status === 'rejected');
    if (rejected.length) throw new AggregateError(rejected.map(result => result.reason), 'Content processing failed');

    console.error(`\nDone: ${succeeded} succeeded, ${failed} failed out of ${captures.length}`);
  } catch (err) {
    console.error('Fetch failed:', err);
    process.exitCode = 1;
  } finally {
    closeDatabase(db);
  }
}
