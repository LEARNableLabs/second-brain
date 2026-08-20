import { getDatabase, closeDatabase } from '../db/connection.js';
import { migrate } from '../db/migrate.js';
import { searchCaptures, type CaptureSearchResult } from '../db/search-operations.js';
import { searchNotes, type NoteSearchResult } from '../search/note-search.js';
import { loadConfig, getOutputDir } from '../config/reader.js';

interface SearchOptions {
  from?: string;
  to?: string;
  domain?: string;
  limit?: string;
  notesOnly?: boolean;
  dbOnly?: boolean;
}

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

function highlight(text: string): string {
  return text.replace(/>>>(.*?)<<</g, `${BOLD}$1${RESET}`);
}

function formatCaptureResults(results: CaptureSearchResult[]): string {
  const lines: string[] = [`${BOLD}Captures${RESET} (${results.length} results)\n`];

  for (const r of results) {
    lines.push(`  ${DIM}${r.date}${RESET}  ${highlight(r.snippet || r.title)}`);
    lines.push(`  ${DIM}${r.url}${RESET}`);
    lines.push(`  ${DIM}${r.domain} | ${r.source}${RESET}\n`);
  }

  return lines.join('\n');
}

function formatNoteResults(results: NoteSearchResult[]): string {
  const lines: string[] = [`${BOLD}Daily Notes${RESET} (${results.length} results)\n`];

  for (const r of results) {
    lines.push(`  ${DIM}${r.date}${RESET}  ${r.filepath}`);
    for (const snippet of r.snippets) {
      lines.push(`  ${highlight(snippet)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export async function searchCommand(query: string, options: SearchOptions = {}): Promise<void> {
  const limit = parseInt(options.limit || '20', 10);
  console.error(`Searching for "${query}"...`);

  let captureResults: CaptureSearchResult[] = [];
  let noteResults: NoteSearchResult[] = [];

  if (!options.notesOnly) {
    const db = getDatabase();
    try {
      migrate(db);
      captureResults = searchCaptures(db, query, {
        from: options.from,
        to: options.to,
        domain: options.domain,
        limit,
      });
    } finally {
      closeDatabase(db);
    }
  }

  if (!options.dbOnly) {
    const config = await loadConfig();
    const outputDir = getOutputDir(config);
    noteResults = await searchNotes(outputDir, query, {
      from: options.from,
      to: options.to,
      limit,
    });
  }

  if (captureResults.length === 0 && noteResults.length === 0) {
    console.log(`No results for "${query}"`);
    return;
  }

  if (captureResults.length > 0) {
    console.log(formatCaptureResults(captureResults));
  }

  if (noteResults.length > 0) {
    console.log(formatNoteResults(noteResults));
  }
}
