import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchMetaDescription, fetchAllDescriptions, type MetaResult } from '../../src/generators/meta-fetcher.js';

describe('Meta Description Fetcher', () => {
  // Mock fetch globally
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  function mockFetchResponse(html: string, status: number = 200) {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      text: async () => html,
    });
  }

  describe('fetchMetaDescription', () => {
    it('extracts og:description from HTML', async () => {
      const html = `
        <html>
          <head>
            <meta property="og:description" content="Test OG description">
          </head>
        </html>
      `;
      mockFetchResponse(html);

      const result = await fetchMetaDescription('https://example.com');

      expect(result.description).toBe('Test OG description');
      expect(result.error).toBeUndefined();
    });

    it('falls back to meta name="description" when og:description is absent', async () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="Standard meta description">
          </head>
        </html>
      `;
      mockFetchResponse(html);

      const result = await fetchMetaDescription('https://example.com');

      expect(result.description).toBe('Standard meta description');
      expect(result.error).toBeUndefined();
    });

    it('prefers og:description over meta description when both exist', async () => {
      const html = `
        <html>
          <head>
            <meta name="description" content="Standard meta">
            <meta property="og:description" content="OG meta">
          </head>
        </html>
      `;
      mockFetchResponse(html);

      const result = await fetchMetaDescription('https://example.com');

      expect(result.description).toBe('OG meta');
    });

    it('returns error when HTML has no description tags', async () => {
      const html = `
        <html>
          <head>
            <title>No Description</title>
          </head>
        </html>
      `;
      mockFetchResponse(html);

      const result = await fetchMetaDescription('https://example.com');

      expect(result.description).toBeUndefined();
      expect(result.error).toBe('No description found');
    });

    it('returns error when fetch fails with non-OK status', async () => {
      mockFetchResponse('', 404);

      const result = await fetchMetaDescription('https://example.com');

      expect(result.description).toBeUndefined();
      expect(result.error).toBe('HTTP 404');
    });

    it('returns error when network request fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchMetaDescription('https://example.com');

      expect(result.description).toBeUndefined();
      expect(result.error).toBe('Network error');
    });

    it('trims whitespace from description', async () => {
      const html = `
        <html>
          <head>
            <meta property="og:description" content="  Whitespace test  ">
          </head>
        </html>
      `;
      mockFetchResponse(html);

      const result = await fetchMetaDescription('https://example.com');

      expect(result.description).toBe('Whitespace test');
    });
  });

  describe('fetchAllDescriptions', () => {
    it('returns Map with URL keys and description values', async () => {
      const html1 = '<html><head><meta property="og:description" content="First page"></head></html>';
      const html2 = '<html><head><meta property="og:description" content="Second page"></head></html>';

      mockFetchResponse(html1);
      mockFetchResponse(html2);

      const result = await fetchAllDescriptions(['https://first.com', 'https://second.com']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);
      expect(result.get('https://first.com')).toBe('First page');
      expect(result.get('https://second.com')).toBe('Second page');
    });

    it('handles mixed success and failure - only includes successful URLs', async () => {
      const html1 = '<html><head><meta property="og:description" content="Success"></head></html>';
      const html2 = '<html><head><title>No description</title></head></html>';

      mockFetchResponse(html1);
      mockFetchResponse(html2);

      const result = await fetchAllDescriptions(['https://success.com', 'https://fail.com']);

      expect(result.size).toBe(1);
      expect(result.get('https://success.com')).toBe('Success');
      expect(result.has('https://fail.com')).toBe(false);
    });

    it('returns empty Map when all URLs fail', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchAllDescriptions(['https://fail1.com', 'https://fail2.com']);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });

    it('returns empty Map for empty URL array', async () => {
      const result = await fetchAllDescriptions([]);

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
    });
  });
});
