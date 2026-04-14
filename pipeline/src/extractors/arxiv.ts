import * as cheerio from 'cheerio';
import type { ExtractedContent } from '@second-brain/shared';

const ARXIV_API = 'http://export.arxiv.org/api/query';
const USER_AGENT = 'SecondBrain/1.0 (Knowledge Capture)';

function parseArxivId(url: string): string | null {
  // Matches: arxiv.org/abs/2103.00020, arxiv.org/pdf/2103.00020
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/([^\/?#]+)/);
  return match?.[1] ?? null;
}

export function canHandle(domain: string): boolean {
  return domain === 'arxiv.org' || domain.endsWith('.arxiv.org');
}

export async function extract(url: string): Promise<ExtractedContent> {
  const arxivId = parseArxivId(url);
  if (!arxivId) {
    throw new Error(`Cannot parse arXiv ID from ${url}`);
  }

  const apiUrl = `${ARXIV_API}?id_list=${arxivId}`;
  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`ArXiv API HTTP ${response.status}`);
  }

  const xml = await response.text();
  const $ = cheerio.load(xml, { xmlMode: true });

  const entry = $('entry').first();
  if (entry.length === 0) {
    throw new Error(`No entry found for arXiv ID ${arxivId}`);
  }

  const title = entry.find('title').text().replace(/\s+/g, ' ').trim();
  const abstract = entry.find('summary').text().replace(/\s+/g, ' ').trim();
  const authors = entry.find('author name').map((_, el) => $(el).text()).get();
  const categories = entry.find('category').map((_, el) => $(el).attr('term')).get();
  const published = entry.find('published').text().trim();

  const body = [
    `Authors: ${authors.join(', ')}`,
    `Published: ${published}`,
    `Categories: ${categories.join(', ')}`,
    '',
    abstract,
  ].join('\n');

  return {
    title,
    body,
    contentType: 'paper',
    wordCount: body.split(/\s+/).length,
    extractedAt: Date.now(),
  };
}
