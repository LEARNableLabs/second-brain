import path from 'path';
import { getDatabase, closeDatabase } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { getByDate, updateStatus } from '../db/operations.js';
import { getContentByDate, deleteContentByDate } from '../db/content-operations.js';
import { generateDailyNote } from '../generators/markdown.js';
import { fetchAllDescriptions } from '../generators/meta-fetcher.js';
import { saveNote } from '../generators/writer.js';
import { loadConfig, getOutputDir } from '../config/reader.js';
import { ensureGitRepo, autoCommitNotes } from '../git/auto-commit.js';
import { createProvider } from '../ai/provider.js';
import { curateDailyNote } from '../ai/curate.js';
import { scanVaultNotes } from '../ai/vault-scanner.js';

interface CurateOptions {
  date?: string;
  dry?: boolean;
  eod?: boolean;
}

export async function curateCommand(options: CurateOptions = {}): Promise<void> {
  const date = options.date || new Date().toISOString().split('T')[0];
  const isEndOfDay = options.eod || false;
  console.error(`Curating daily note for ${date}${isEndOfDay ? ' (end-of-day)' : ''}...`);

  const config = await loadConfig();
  const outputDir = getOutputDir(config);

  const llmConfig = config.llm || { provider: 'claude' as const };
  // Allow ANTHROPIC_API_KEY env var as fallback
  if (llmConfig.provider === 'claude' && !llmConfig.apiKey) {
    llmConfig.apiKey = process.env.ANTHROPIC_API_KEY;
  }

  const db = getDatabase();
  try {
    const { applied } = migrate(db);
    if (applied > 0) {
      console.error(`Applied ${applied} migration(s).`);
    }

    // Get all captures for the date (any status — we want the full picture for curation)
    const allCaptures = getByDate(db, date);
    // Get captures ready for curation (content_fetched status)
    const readyCaptures = allCaptures.filter(c => c.status === 'content_fetched');

    if (readyCaptures.length === 0 && allCaptures.length === 0) {
      console.error(`No captures found for ${date}`);
      return;
    }

    // Get extracted content for all captures
    const content = getContentByDate(db, date);
    console.error(`Found ${allCaptures.length} captures, ${content.length} with extracted content`);

    // Scan vault for existing note titles (for wikilink matching)
    const vaultNotes = await scanVaultNotes(outputDir);
    console.error(`Found ${vaultNotes.length} vault notes for wikilink matching`);

    // Generate AI summary
    console.error('Generating AI summary...');
    const provider = createProvider(llmConfig);
    const summary = await curateDailyNote(
      provider,
      date,
      allCaptures,
      content,
      vaultNotes,
      isEndOfDay
    );

    // Regenerate the full daily note with AI summary injected
    const descriptions = await fetchAllDescriptions(allCaptures.map(c => c.url));
    const markdown = generateDailyNote(date, allCaptures, descriptions, summary);

    if (options.dry) {
      console.log(markdown);
      return;
    }

    await ensureGitRepo(outputDir);

    const filename = `${date}.md`;
    const filepath = path.join(outputDir, filename);
    await saveNote(filepath, markdown);
    console.error(`Wrote ${filepath}`);

    // Update status for curated captures
    for (const capture of readyCaptures) {
      updateStatus(db, capture.url, date, 'curated');
    }

    // Clean up ephemeral content (PROC-03)
    if (isEndOfDay) {
      const deleted = deleteContentByDate(db, date);
      console.error(`Cleaned up ${deleted} ephemeral content rows`);
    }

    const committed = await autoCommitNotes(outputDir, [filename]);
    if (committed) {
      console.error('Auto-committed to notes repository');
    }

    console.error(`Done: curated ${allCaptures.length} captures`);
  } catch (err) {
    console.error('Curate failed:', err);
    process.exitCode = 1;
  } finally {
    closeDatabase(db);
  }
}
