import path from 'path';
import { getDatabase, closeDatabase } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { getByDate, updateStatus } from '../db/operations.js';
import { generateDailyNote } from '../generators/markdown.js';
import { fetchAllDescriptions } from '../generators/meta-fetcher.js';
import { saveNote } from '../generators/writer.js';
import { loadConfig, getOutputDir } from '../config/reader.js';
import { ensureGitRepo, autoCommitNotes } from '../git/auto-commit.js';

interface GenerateOptions {
  date?: string;
  dry?: boolean;
}

export async function generateCommand(options: GenerateOptions = {}): Promise<void> {
  const date = options.date || new Date().toISOString().split('T')[0];
  console.error(`Generating daily note for ${date}...`);

  const config = await loadConfig();
  const outputDir = getOutputDir(config);

  const db = getDatabase();
  try {
    const { applied } = migrate(db);
    if (applied > 0) {
      console.error(`Applied ${applied} migration(s).`);
    }

    const captures = getByDate(db, date);
    if (captures.length === 0) {
      console.error(`No captures found for ${date}`);
      return;
    }

    console.error(`Found ${captures.length} captures for ${date}`);

    const descriptions = await fetchAllDescriptions(captures.map(c => c.url));
    const markdown = generateDailyNote(date, captures, descriptions);

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
      updateStatus(db, capture.url, date, 'written');
    }

    const committed = await autoCommitNotes(outputDir, [filename]);
    if (committed) {
      console.error('Auto-committed to notes repository');
    }
  } catch (err) {
    console.error('Generate failed:', err);
    process.exitCode = 1;
  } finally {
    closeDatabase(db);
  }
}
