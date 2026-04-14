import { renderFrontmatter } from './frontmatter.js';
import type { CaptureRow } from '../db/operations.js';

export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_\[\]()#+\-!])/g, '\\$1');
}

export function formatEntry(entry: CaptureRow & { description?: string }): string {
  const url = new URL(entry.url);
  const pathname = url.pathname;

  let prefix = '';
  let suffix = '';

  if (entry.source === 'manual') {
    prefix = '⭐ ';
  }

  if (entry.source === 'backfill') {
    suffix = ' *(from history)*';
  }

  const escapedTitle = escapeMarkdown(entry.title);
  const firstLine = `- ${prefix}[${escapedTitle}](${entry.url}) — ${entry.domain}${pathname}${suffix}`;

  if (entry.description) {
    return `${firstLine}\n  ${entry.description}`;
  }

  return firstLine;
}

export function groupByDomain(entries: CaptureRow[]): Record<string, CaptureRow[]> {
  const grouped: Record<string, CaptureRow[]> = {};

  for (const entry of entries) {
    if (!grouped[entry.domain]) {
      grouped[entry.domain] = [];
    }
    grouped[entry.domain].push(entry);
  }

  // Sort domain keys alphabetically
  const sortedGrouped: Record<string, CaptureRow[]> = {};
  const sortedDomains = Object.keys(grouped).sort((a, b) => a.localeCompare(b));

  for (const domain of sortedDomains) {
    sortedGrouped[domain] = grouped[domain];
  }

  return sortedGrouped;
}

export function generateDailyNote(
  date: string,
  entries: CaptureRow[],
  descriptions?: Map<string, string>,
  aiSummary?: string
): string {
  const frontmatter = renderFrontmatter(date, entries);

  let note = frontmatter;

  if (aiSummary) {
    note += '\n' + aiSummary + '\n\n';
  } else {
    note += '\n## Highlights\n\n';
    note += '*AI-curated summary will appear here after Phase 5*\n\n';
  }

  note += '## Browsing Log\n\n';

  const grouped = groupByDomain(entries);

  for (const [domain, domainEntries] of Object.entries(grouped)) {
    note += `### ${domain}\n\n`;

    for (const entry of domainEntries) {
      const description = descriptions?.get(entry.url);
      const entryWithDesc = description ? { ...entry, description } : entry;
      note += formatEntry(entryWithDesc) + '\n';
    }

    note += '\n';
  }

  return note;
}
