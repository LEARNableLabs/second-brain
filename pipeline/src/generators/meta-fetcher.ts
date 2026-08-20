import * as cheerio from 'cheerio';
import { createModuleLogger } from '@second-brain/shared/logger';

const logger = createModuleLogger('generators:meta-fetcher');

export interface MetaResult {
  description?: string;
  error?: string;
}

export async function fetchMetaDescription(url: string): Promise<MetaResult> {
  logger.debug({ url }, 'fetching meta description');
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'SecondBrain/1.0 (Knowledge Capture)' },
    });

    if (!response.ok) {
      logger.warn({ url, status: response.status }, 'fetch returned non-OK status');
      return { error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogDescription = $('meta[property="og:description"]').attr('content');
    if (ogDescription?.trim()) {
      return { description: ogDescription.trim() };
    }

    const metaDescription = $('meta[name="description"]').attr('content');
    if (metaDescription?.trim()) {
      return { description: metaDescription.trim() };
    }

    return { error: 'No description found' };
  } catch (err: any) {
    if (err.name === 'TimeoutError') {
      logger.warn({ url }, 'meta fetch timed out');
      return { error: 'Timeout after 5s' };
    }
    logger.error({ url, err }, 'meta fetch failed');
    return { error: err.message };
  }
}

export async function fetchAllDescriptions(urls: string[]): Promise<Map<string, string>> {
  logger.info({ urlCount: urls.length }, 'fetching all meta descriptions');
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const result = await fetchMetaDescription(url);
      return { url, result };
    })
  );

  const descriptions = new Map<string, string>();

  for (const settled of results) {
    if (settled.status === 'fulfilled') {
      const { url, result } = settled.value;
      if (result.description) {
        descriptions.set(url, result.description);
      } else {
        console.error(`Meta fetch failed for ${url}: ${result.error}`);
      }
    } else {
      console.error(`Meta fetch failed: ${settled.reason}`);
    }
  }

  return descriptions;
}
