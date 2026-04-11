import matter from 'gray-matter';
import type { CaptureRow } from '../db/operations.js';

export interface Frontmatter {
  date: string;
  captures: number;
  manual: number;
  top_domains: string[];
  browsers: string[];
}

export function buildFrontmatter(date: string, entries: CaptureRow[]): Frontmatter {
  const manualCount = entries.filter(e => e.source === 'manual').length;
  const uniqueDomains = [...new Set(entries.map(e => e.domain))];
  const topDomains = uniqueDomains.slice(0, 5);

  return {
    date,
    captures: entries.length,
    manual: manualCount,
    top_domains: topDomains,
    browsers: ['Chrome', 'Comet'],
  };
}

export function renderFrontmatter(date: string, entries: CaptureRow[]): string {
  const frontmatterObj = buildFrontmatter(date, entries);
  const result = matter.stringify('', frontmatterObj);
  return result;
}
