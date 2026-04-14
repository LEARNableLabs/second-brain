import type { ExtractedContent } from '@second-brain/shared';
import * as arxiv from './arxiv.js';
import * as article from './article.js';
import * as general from './general.js';

export async function extractContent(url: string): Promise<ExtractedContent> {
  const domain = new URL(url).hostname;

  // 1. ArXiv papers get structured API extraction
  if (arxiv.canHandle(domain)) {
    return arxiv.extract(url);
  }

  // 2. Try article extraction (returns null if page isn't article-shaped)
  const articleResult = await article.extract(url);
  if (articleResult) {
    return articleResult;
  }

  // 3. Fall back to general meta + paragraphs
  return general.extract(url);
}
