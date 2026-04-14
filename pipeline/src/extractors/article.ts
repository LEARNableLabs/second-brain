import { extract as extractArticle } from '@extractus/article-extractor';
import type { ExtractedContent } from '@second-brain/shared';

const MAX_WORDS = 5000;
const USER_AGENT = 'SecondBrain/1.0 (Knowledge Capture)';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function truncate(text: string, maxWords: number): string {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
}

export async function extract(url: string): Promise<ExtractedContent | null> {
  const article = await extractArticle(url, {}, {
    signal: AbortSignal.timeout(10_000),
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!article || !article.content) {
    return null;
  }

  const plainText = stripHtml(article.content);
  const body = truncate(plainText, MAX_WORDS);

  return {
    title: article.title || '',
    body,
    contentType: 'article',
    wordCount: body.split(/\s+/).length,
    extractedAt: Date.now(),
  };
}
