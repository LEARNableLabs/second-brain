import * as cheerio from 'cheerio';
import type { ExtractedContent } from '@second-brain/shared';

const MAX_PARAGRAPHS = 10;
const USER_AGENT = 'SecondBrain/1.0 (Knowledge Capture)';

export async function extract(url: string): Promise<ExtractedContent> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().trim() ||
    '';

  const ogDesc = $('meta[property="og:description"]').attr('content')?.trim() || '';
  const metaDesc = $('meta[name="description"]').attr('content')?.trim() || '';

  // Grab first N paragraphs of body text
  const paragraphs: string[] = [];
  $('p').each((_, el) => {
    if (paragraphs.length >= MAX_PARAGRAPHS) return false;
    const text = $(el).text().trim();
    if (text.length > 30) {
      paragraphs.push(text);
    }
  });

  const parts = [ogDesc || metaDesc, ...paragraphs].filter(Boolean);
  const body = parts.join('\n\n');

  return {
    title,
    body,
    contentType: 'general',
    wordCount: body.split(/\s+/).length,
    extractedAt: Date.now(),
  };
}
