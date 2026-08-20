import { promises as fs } from 'fs';
import path from 'path';

export interface NoteSearchResult {
  date: string;
  filepath: string;
  snippets: string[];
}

export interface NoteSearchOptions {
  from?: string;
  to?: string;
  limit?: number;
}

export function extractSnippets(content: string, queryLower: string, maxSnippets: number): string[] {
  const contentLower = content.toLowerCase();
  const snippets: string[] = [];
  let startPos = 0;

  while (snippets.length < maxSnippets) {
    const idx = contentLower.indexOf(queryLower, startPos);
    if (idx === -1) break;

    const windowStart = Math.max(0, idx - 80);
    const windowEnd = Math.min(content.length, idx + queryLower.length + 80);

    let snippet = content.slice(windowStart, windowEnd).replace(/\n/g, ' ');
    if (windowStart > 0) snippet = '...' + snippet;
    if (windowEnd < content.length) snippet = snippet + '...';

    const matchStart = idx - windowStart + (windowStart > 0 ? 3 : 0);
    const matchEnd = matchStart + queryLower.length;
    snippet = snippet.slice(0, matchStart) + '>>>' + snippet.slice(matchStart, matchEnd) + '<<<' + snippet.slice(matchEnd);

    snippets.push(snippet);
    startPos = idx + queryLower.length;
  }

  return snippets;
}

export async function searchNotes(
  outputDir: string,
  query: string,
  options: NoteSearchOptions = {}
): Promise<NoteSearchResult[]> {
  const limit = options.limit ?? 10;
  const datePattern = /^\d{4}-\d{2}-\d{2}\.md$/;

  let files: string[];
  try {
    files = await fs.readdir(outputDir);
  } catch {
    return [];
  }

  const noteFiles = files
    .filter(f => datePattern.test(f))
    .filter(f => {
      const date = f.replace('.md', '');
      if (options.from && date < options.from) return false;
      if (options.to && date > options.to) return false;
      return true;
    })
    .sort()
    .reverse();

  const results: NoteSearchResult[] = [];
  const queryLower = query.toLowerCase();

  for (const file of noteFiles) {
    if (results.length >= limit) break;

    const filepath = path.join(outputDir, file);
    const content = await fs.readFile(filepath, 'utf-8');

    if (content.toLowerCase().includes(queryLower)) {
      const snippets = extractSnippets(content, queryLower, 3);
      results.push({
        date: file.replace('.md', ''),
        filepath,
        snippets,
      });
    }
  }

  return results;
}
