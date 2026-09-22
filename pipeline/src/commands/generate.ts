import path from 'path';
import { promises as fs } from 'fs';
import { localDate, parseDate } from '../config/date.js';
import crypto from 'crypto';
import { getDatabase, closeDatabase } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { getByDate, updateStatus } from '../db/operations.js';
import { generateDailyNote } from '../generators/markdown.js';
import { fetchAllDescriptions } from '../generators/meta-fetcher.js';
import { saveNote } from '../generators/writer.js';
import { loadConfig, getOutputDir } from '../config/reader.js';
import { ensureGitRepo, autoCommitNotes } from '../git/auto-commit.js';
import { createRequestLogger } from '@second-brain/shared/logger';

interface GenerateOptions {
  date?: string;
  dry?: boolean;
}

export async function generateCommand(options: GenerateOptions = {}): Promise<void> {
  const requestId = crypto.randomUUID();
  const logger = createRequestLogger('cmd:generate', requestId);
  const date = options.date ? parseDate(options.date) : localDate();
  logger.info({ requestId, date }, 'generate command started');
  console.error(`Generating daily note for ${date}...`);

  const config = await loadConfig();
  const outputDir = getOutputDir(config);

  const db = getDatabase();
  try {
    const { applied } = migrate(db);
    if (applied > 0) {
      logger.info({ applied }, 'applied migrations');
      console.error(`Applied ${applied} migration(s).`);
    }

    const captures = getByDate(db, date);
    if (captures.length === 0) {
      console.error(`No captures found for ${date}`);
      return;
    }

    console.error(`Found ${captures.length} captures for ${date}`);

    const descriptions = await fetchAllDescriptions(captures.map(c => c.url).filter(url => /^https?:\/\//.test(url)));
    // Preserve existing highlights if AI curation is unavailable on this run.
    let summary: string | undefined;
    try {
      const existing = await fs.readFile(path.join(outputDir, `${date}.md`), 'utf8');
      summary = existing.match(/(^## Highlights\r?\n[\s\S]*?)(?=^## Browsing Log\s*$)/m)?.[1].trimEnd();
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    const markdown = generateDailyNote(date, captures, descriptions, summary);

    if (options.dry) {
      console.log(markdown);
      return;
    }

    await ensureGitRepo(outputDir);

    const filename = `${date}.md`;
    const filepath = path.join(outputDir, filename);
    await saveNote(filepath, markdown);
    console.error(`Wrote ${filepath}`);

    for (const capture of captures) {
      if (capture.status === 'captured') updateStatus(db, capture.url, date, 'written');
    }

    const committed = await autoCommitNotes(outputDir, [filename]);
    if (committed) {
      console.error('Auto-committed to notes repository');
    }
  } catch (err) {
    logger.error({ err }, 'generate failed');
    console.error('Generate failed:', err);
    process.exitCode = 1;
  } finally {
    logger.info('generate command finished');
    closeDatabase(db);
  }
}
