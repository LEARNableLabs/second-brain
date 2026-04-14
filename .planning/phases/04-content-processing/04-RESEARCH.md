# Phase 04: Content Processing - Research

**Researched:** 2026-04-14
**Domain:** Content extraction, web scraping, domain-aware routing
**Confidence:** HIGH

## Summary

Phase 4 implements a content fetching pipeline that extracts full page content from URLs marked as `written` by Phase 3. The system uses domain-aware routing to apply specialized extractors: arXiv API for academic papers, article extraction libraries for blog posts, and enhanced meta scraping for general pages. Extracted content is stored temporarily in a separate SQLite `content` table and discarded after Phase 5 AI processing completes.

The core technical challenge is balancing extraction quality with performance and token costs. ArXiv provides structured metadata via a REST API. General articles require parser libraries like `@extractus/article-extractor` (linkedom-based, actively maintained) or `@mozilla/readability` (JSDOM-based, Firefox Reader View algorithm). Rate limiting and concurrency control prevent hammering servers.

**Primary recommendation:** Use `@extractus/article-extractor` for general articles (linkedom-based, faster than JSDOM, actively maintained with 2025 releases), arXiv export API for papers, and enhanced cheerio scraping for general pages. Store content in a separate table with foreign key to captures, delete after AI processing. Implement p-limit for concurrency control and domain-specific rate limiting.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Domain-aware extraction with a strategy pattern. Each URL is routed to the appropriate extractor based on domain:
  - `arxiv.org` → arxiv API (structured abstract, authors, categories)
  - General articles/blogs → Readability-style extraction (article body text, stripped of nav/ads/boilerplate)
  - Everything else → Enhanced meta fetcher (OG tags + first N paragraphs of body text)
- **D-02:** Extraction strategy is extensible — new domain handlers can be added without modifying the router. Plugin-style pattern where each handler declares which domains it handles.
- **D-03:** The existing `meta-fetcher.ts` (Phase 3) remains unchanged for daily note generation. Phase 4 adds a separate, deeper content extraction layer that runs after notes are generated.
- **D-04:** Extracted content stored as a structured object: `{ title, body, contentType, wordCount, extractedAt }`. The `contentType` discriminator (`'article' | 'paper' | 'general'`) tells Phase 5 AI how to process each item.
- **D-05:** Body text is plain text (HTML stripped), truncated to a reasonable limit to control downstream token costs. Exact limit is Claude's discretion.
- **D-06:** Extracted content stored in a separate SQLite `content` table, joined to `captures` by URL + date. Keeps the captures table lean while content is in transit.
- **D-07:** Content is ephemeral — after Phase 5 AI curation processes it, the content rows are deleted. This satisfies PROC-03 (fetched content used for analysis then discarded).
- **D-08:** If content already exists for a URL+date (re-run scenario), the existing content is overwritten with fresh fetch.
- **D-09:** Phase 4 processes entries with status `written` (after Phase 3 has generated the daily note). Status transitions: `written → content_fetched`. Phase 5 then reads `content_fetched` entries.
- **D-10:** Processing is incremental — only handles URLs not yet at `content_fetched` status. Running `second-brain fetch` multiple times in a day is safe (idempotent for already-processed URLs).
- **D-11:** Failed fetches record error info in the content table (URL, error message, timestamp). These entries are skipped during Phase 5 AI curation.
- **D-12:** On next run, previously-failed URLs are retried (content table error entries are overwritten on re-fetch attempt).
- **D-13:** CLI command is `second-brain fetch` — follows the subcommand pattern. Pipeline is: `export` → `generate` → `fetch` → `curate` (Phase 5).
- **D-14:** Supports `--date YYYY-MM-DD` flag (default: today) and `--dry` flag (show what would be fetched without fetching).

### Claude's Discretion

- Body text truncation limit (balance between content quality and token costs)
- Concurrency level for parallel fetches (how many URLs to fetch simultaneously)
- Rate limiting strategy per domain (avoid hammering same server)
- Readability library choice (mozilla/readability, @extractus/article-extractor, or similar)
- Arxiv API response parsing details
- User-Agent string for content fetching
- Timeout per fetch request

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROC-01 | System fetches full page content at processing time for captured URLs (articles, papers, blog posts) | ArXiv API + article extraction libraries enable full content fetching |
| PROC-02 | System uses domain-aware extraction (e.g. arxiv API for papers, article extractors for blogs, OpenGraph for general pages) | Strategy pattern with domain-specific handlers (arxiv extractor, article extractor, meta fetcher) |
| PROC-03 | Fetched content is used for AI analysis then discarded — only metadata + AI summaries stored | Separate ephemeral `content` table, deleted after Phase 5 AI processing |
| PROC-04 | Processing runs incrementally every hour via launchd, handling only new captures since last run | Status-based filtering (`written → content_fetched`), idempotent re-run support |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @extractus/article-extractor | 8.0.20 | Article content extraction | Uses linkedom (faster than JSDOM), actively maintained (Sept 2025), sanitizes HTML, returns structured data (title/author/content/published) |
| linkedom | 0.18.12 | DOM parser for article-extractor | Faster and lighter than JSDOM (1/3 time, 1/3 heap), used by @extractus/article-extractor |
| p-limit | 7.3.0 | Concurrency control | Simple API for limiting N concurrent promises, 100M weekly downloads, perfect for batch URL fetching |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| cheerio | 1.2.0 | HTML parsing for general pages | Already a dependency (Phase 3), use for enhanced meta extraction (OG tags + first N paragraphs) |
| better-sqlite3 | 12.8.0 | Database operations | Already a dependency (Phase 2), use for content table CRUD |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @extractus/article-extractor | @mozilla/readability | Readability uses JSDOM (slower, heavier), but is Firefox's proven algorithm. Choose if compatibility with Firefox Reader View is critical. |
| p-limit | bottleneck | Bottleneck supports complex rate limiting (requests/second, reservoir refills), but is overkill for simple concurrency control. Choose if per-domain rate limits become critical. |
| linkedom | jsdom | JSDOM is more mature (34M downloads/week vs 276K), but 3x slower and 3x memory usage. Only choose if linkedom has DOM API gaps. |

**Installation:**
```bash
cd pipeline
npm install @extractus/article-extractor linkedom p-limit
```

**Version verification:** Verified 2026-04-14 against npm registry. All packages are current and actively maintained.

## Architecture Patterns

### Recommended Project Structure
```
pipeline/src/
├── extractors/          # Domain-specific content extractors
│   ├── strategy.ts      # Router: domain → extractor
│   ├── arxiv.ts         # ArXiv API handler
│   ├── article.ts       # @extractus/article-extractor wrapper
│   └── general.ts       # Enhanced meta fetcher (cheerio)
├── commands/
│   └── fetch.ts         # CLI: second-brain fetch
├── db/
│   ├── operations.ts    # Add content table CRUD functions
│   └── migrations/
│       └── 002_content_table.sql  # New migration
└── generators/
    └── meta-fetcher.ts  # UNCHANGED (Phase 3)
```

### Pattern 1: Strategy Pattern for Domain Routing

**What:** Route each URL to the appropriate extractor based on domain matching

**When to use:** When different content sources require different extraction techniques

**Example:**
```typescript
// Source: Standard strategy pattern + user decision D-01/D-02
interface ContentExtractor {
  domains: string[]  // Which domains this extractor handles
  extract(url: string): Promise<ExtractedContent>
}

// Strategy registry
const extractors: ContentExtractor[] = [
  new ArxivExtractor(),    // domains: ['arxiv.org']
  new ArticleExtractor(),  // domains: [] (default fallback for articles)
  new GeneralExtractor(),  // domains: [] (final fallback)
]

async function extractContent(url: string): Promise<ExtractedContent> {
  const domain = new URL(url).hostname
  
  // Find matching extractor (first match wins)
  const extractor = extractors.find(e => 
    e.domains.length === 0 || e.domains.some(d => domain === d || domain.endsWith('.' + d))
  )
  
  return extractor.extract(url)
}
```

### Pattern 2: ArXiv API Integration

**What:** Fetch structured paper metadata from arXiv export API

**When to use:** When URL is from arxiv.org domain

**Example:**
```typescript
// Source: https://info.arxiv.org/help/api/user-manual.html
async function fetchArxivPaper(url: string): Promise<ExtractedContent> {
  // Extract arXiv ID from URL (e.g., https://arxiv.org/abs/2103.00020)
  const arxivId = url.match(/arxiv\.org\/abs\/([^\/]+)/)?.[1]
  if (!arxivId) throw new Error('Invalid arXiv URL')
  
  // Query arXiv API
  const apiUrl = `http://export.arxiv.org/api/query?id_list=${arxivId}`
  const response = await fetch(apiUrl, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'SecondBrain/1.0 (Knowledge Capture)' }
  })
  
  if (!response.ok) throw new Error(`ArXiv API HTTP ${response.status}`)
  
  const xml = await response.text()
  // Parse Atom XML: <title>, <summary>, <author><name>, <category>, <published>
  // Return: { title, body: abstract, contentType: 'paper', wordCount, extractedAt }
}
```

### Pattern 3: Article Extraction with Timeout and Error Handling

**What:** Extract article content with timeout, retry on transient failures

**When to use:** For blog posts, news articles, general web content

**Example:**
```typescript
// Source: https://github.com/extractus/article-extractor + AbortSignal pattern
import { extract } from '@extractus/article-extractor'

async function extractArticle(url: string): Promise<ExtractedContent> {
  try {
    const article = await extract(url, {
      descriptionLengthThreshold: 120,
      contentLengthThreshold: 500
    }, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'SecondBrain/1.0 (Knowledge Capture)' }
    })
    
    // article contains: { title, content, author, published, ... }
    const plainText = stripHtml(article.content || '')
    const truncated = truncateText(plainText, MAX_WORDS)
    
    return {
      title: article.title,
      body: truncated,
      contentType: 'article',
      wordCount: countWords(truncated),
      extractedAt: Date.now()
    }
  } catch (err) {
    if (err.name === 'TimeoutError') {
      throw new Error('Extraction timeout after 10s')
    }
    throw err
  }
}
```

### Pattern 4: Concurrency Control with p-limit

**What:** Limit parallel fetches to N concurrent requests to avoid overwhelming servers

**When to use:** When processing batches of URLs in parallel

**Example:**
```typescript
// Source: https://www.npmjs.com/package/p-limit
import pLimit from 'p-limit'

async function fetchAllContent(urls: string[]): Promise<Map<string, ExtractedContent>> {
  const limit = pLimit(5)  // Max 5 concurrent fetches
  
  const results = await Promise.allSettled(
    urls.map(url => 
      limit(() => extractContent(url))  // Wrapped in limiter
    )
  )
  
  const content = new Map<string, ExtractedContent>()
  for (let i = 0; i < results.length; i++) {
    const settled = results[i]
    if (settled.status === 'fulfilled') {
      content.set(urls[i], settled.value)
    } else {
      console.error(`Fetch failed for ${urls[i]}:`, settled.reason)
    }
  }
  
  return content
}
```

### Pattern 5: Ephemeral Content Storage

**What:** Store extracted content in separate table, delete after Phase 5 processing

**When to use:** Content needed temporarily for AI analysis but not long-term storage

**Example:**
```typescript
// Source: User decision D-06/D-07/D-08 + SQLite best practices
// Migration: 002_content_table.sql
CREATE TABLE IF NOT EXISTS content (
  url TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT,
  body TEXT,
  content_type TEXT NOT NULL CHECK(content_type IN ('article', 'paper', 'general')),
  word_count INTEGER,
  extracted_at INTEGER NOT NULL,
  error TEXT,  -- NULL on success, error message on failure
  PRIMARY KEY (url, date),
  FOREIGN KEY (url, date) REFERENCES captures(url, date) ON DELETE CASCADE
);

// Insert/update content (upsert pattern)
function saveContent(db, url, date, content) {
  const stmt = db.prepare(`
    INSERT INTO content (url, date, title, body, content_type, word_count, extracted_at)
    VALUES (@url, @date, @title, @body, @contentType, @wordCount, @extractedAt)
    ON CONFLICT(url, date) DO UPDATE SET
      title = @title,
      body = @body,
      content_type = @contentType,
      word_count = @wordCount,
      extracted_at = @extractedAt,
      error = NULL
  `)
  stmt.run({ url, date, ...content })
}

// Delete content after Phase 5 processing (Phase 5 responsibility)
function deleteProcessedContent(db, date) {
  const stmt = db.prepare('DELETE FROM content WHERE date = ?')
  stmt.run(date)
}
```

### Anti-Patterns to Avoid

- **Don't fetch content synchronously** — Use async/await with concurrency limits, never blocking fetch loops
- **Don't store full HTML** — Strip to plain text before storage to control size and token costs
- **Don't skip timeouts** — Every fetch must have AbortSignal.timeout() to prevent hung requests
- **Don't ignore rate limits** — ArXiv requests 3-second delays between calls; respect per-domain limits
- **Don't mutate captures table** — Keep extracted content in separate `content` table to maintain clean schema separation

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Article extraction | Custom HTML parser with heuristics | @extractus/article-extractor | Handles edge cases (ads, navigation, paywall detection), uses proven readability algorithms, sanitizes HTML |
| Concurrency limiting | Custom promise queue with counters | p-limit | Battle-tested (100M downloads/week), simple API, handles backpressure correctly |
| DOM parsing | Custom HTML regex parsing | linkedom or cheerio | Regex fails on malformed HTML, libraries handle encodings/entities/nesting correctly |
| Rate limiting per domain | Custom timestamp tracking | bottleneck (if needed) | Handles token bucket, leaky bucket, reservoir patterns correctly; prevents thundering herd |
| XML parsing | String manipulation for Atom feeds | cheerio or xml2js | Handles namespaces, CDATA, entities, malformed XML gracefully |

**Key insight:** Content extraction is deceptively complex. What looks like "just parse HTML" becomes handling malformed markup, character encodings, relative URLs, embedded scripts, paywall detection, and ad removal. Libraries like @extractus/article-extractor have solved these problems through years of real-world testing.

## Common Pitfalls

### Pitfall 1: Timeout Error Not Distinguished from Network Error

**What goes wrong:** All fetch failures treated the same, can't distinguish transient (timeout, 503) from permanent (404, paywall)

**Why it happens:** Catch-all error handling doesn't inspect error type or HTTP status

**How to avoid:** Check `err.name === 'TimeoutError'` and `response.status` separately. Record error type in content table for different retry strategies.

**Warning signs:** Retrying 404s indefinitely, giving up on transient 503s after single failure

### Pitfall 2: ArXiv API Rate Limiting Violations

**What goes wrong:** Making rapid-fire requests to arXiv API triggers rate limiting, returns HTTP 503

**Why it happens:** Treating arXiv like any other URL, not respecting 3-second delay guideline

**How to avoid:** Implement per-domain rate limiting. ArXiv extractor should enforce minimum 3-second delay between requests.

**Warning signs:** HTTP 503 errors from export.arxiv.org, "slow down" messages in responses

### Pitfall 3: Content Table Foreign Key Violations

**What goes wrong:** Inserting content for URL+date that doesn't exist in captures table fails with FK constraint error

**Why it happens:** Processing URLs from wrong status, or captures row deleted before content insert

**How to avoid:** Always query captures with `getByStatus(db, 'written')` before fetching content. Use transaction to update status + insert content atomically.

**Warning signs:** "FOREIGN KEY constraint failed" errors during content insertion

### Pitfall 4: Memory Exhaustion from Unlimited Concurrency

**What goes wrong:** Fetching 1000 URLs in parallel consumes excessive memory, crashes process

**Why it happens:** Using Promise.all() without concurrency limit

**How to avoid:** Always use p-limit to cap concurrent fetches. Start with 5 concurrent, tune based on memory usage.

**Warning signs:** Process heap size growing unbounded, OOM crashes during large batch fetches

### Pitfall 5: HTML Included in Body Text

**What goes wrong:** Content stored with HTML tags, Phase 5 AI receives `<p>Text</p>` instead of plain text

**Why it happens:** @extractus/article-extractor returns `content` field as sanitized HTML, not plain text

**How to avoid:** Strip HTML tags before storage. Use `textContent` extraction or regex `content.replace(/<[^>]*>/g, '')` as fallback.

**Warning signs:** Token costs higher than expected, AI summaries referencing HTML tags

### Pitfall 6: Truncation Mid-Word

**What goes wrong:** Body text truncated at character limit breaks mid-word: "This is a sen..."

**Why it happens:** Naive substring at character limit doesn't respect word boundaries

**How to avoid:** Truncate to word boundary: find last space before limit, split there

**Warning signs:** User complaints about broken words in summaries, gibberish at end of truncated content

### Pitfall 7: Same Content Refetched Every Run

**What goes wrong:** Content already fetched on previous run is re-fetched, wasting API calls

**Why it happens:** Status not updated to `content_fetched` after successful extraction

**How to avoid:** Update status to `content_fetched` immediately after content insertion succeeds. Verify with `getByStatus(db, 'written')` query before fetch.

**Warning signs:** Same URLs appearing in fetch batch every run, API quota exhausted quickly

## Code Examples

Verified patterns from official sources and established codebase patterns:

### ArXiv API Query Construction

```typescript
// Source: https://info.arxiv.org/help/api/user-manual.html
function buildArxivApiUrl(arxivId: string): string {
  // Remove version suffix if present (e.g., "2103.00020v1" → "2103.00020")
  const cleanId = arxivId.replace(/v\d+$/, '')
  return `http://export.arxiv.org/api/query?id_list=${cleanId}`
}

// Example: https://arxiv.org/abs/2103.00020
const url = 'https://arxiv.org/abs/2103.00020'
const arxivId = url.match(/arxiv\.org\/abs\/([^\/]+)/)?.[1]  // "2103.00020"
const apiUrl = buildArxivApiUrl(arxivId)  // http://export.arxiv.org/api/query?id_list=2103.00020
```

### Article Extraction with @extractus/article-extractor

```typescript
// Source: https://github.com/extractus/article-extractor
import { extract } from '@extractus/article-extractor'

async function extractArticleContent(url: string): Promise<{
  title: string
  body: string
  author?: string
  published?: string
}> {
  const article = await extract(url, {
    descriptionLengthThreshold: 120,
    contentLengthThreshold: 500
  }, {
    signal: AbortSignal.timeout(10000),
    headers: { 'User-Agent': 'SecondBrain/1.0 (Knowledge Capture)' }
  })
  
  if (!article) throw new Error('No article content extracted')
  
  return {
    title: article.title || 'Untitled',
    body: article.content || article.description || '',
    author: article.author,
    published: article.published
  }
}
```

### Content Fetching with Concurrency Limit

```typescript
// Source: Existing meta-fetcher.ts pattern + p-limit
import pLimit from 'p-limit'

interface FetchResult {
  url: string
  content?: ExtractedContent
  error?: string
}

async function fetchContentBatch(urls: string[], concurrency = 5): Promise<FetchResult[]> {
  const limit = pLimit(concurrency)
  
  const results = await Promise.allSettled(
    urls.map(url => 
      limit(async () => {
        const content = await extractContent(url)
        return { url, content }
      })
    )
  )
  
  return results.map((settled, i) => {
    if (settled.status === 'fulfilled') {
      return settled.value
    } else {
      return {
        url: urls[i],
        error: settled.reason?.message || 'Unknown error'
      }
    }
  })
}
```

### Fetch Command Pattern (Following Phase 3 generate.ts)

```typescript
// Source: pipeline/src/commands/generate.ts pattern
import { getDatabase, closeDatabase } from '../db/connection.js'
import { migrate } from '../db/migrate.js'
import { getByStatus, updateStatus } from '../db/operations.js'
import { saveContent } from '../db/content-operations.js'
import { extractContent } from '../extractors/strategy.js'

interface FetchOptions {
  date?: string
  dry?: boolean
}

export async function fetchCommand(options: FetchOptions = {}): Promise<void> {
  const date = options.date || new Date().toISOString().split('T')[0]
  console.error(`Fetching content for ${date}...`)
  
  const db = getDatabase()
  try {
    const { applied } = migrate(db)
    if (applied > 0) console.error(`Applied ${applied} migration(s).`)
    
    const captures = getByStatus(db, 'written')
    const dateCaptured = captures.filter(c => c.date === date)
    
    if (dateCaptured.length === 0) {
      console.error(`No captures with status='written' for ${date}`)
      return
    }
    
    console.error(`Found ${dateCaptured.length} URLs to fetch`)
    
    if (options.dry) {
      console.log(`Would fetch:\n${dateCaptured.map(c => c.url).join('\n')}`)
      return
    }
    
    const results = await fetchContentBatch(dateCaptured.map(c => c.url))
    
    for (const result of results) {
      if (result.content) {
        saveContent(db, result.url, date, result.content)
        updateStatus(db, result.url, date, 'content_fetched')
      } else {
        saveContentError(db, result.url, date, result.error || 'Unknown error')
      }
    }
    
    const succeeded = results.filter(r => r.content).length
    console.error(`Fetched ${succeeded}/${results.length} successfully`)
  } catch (err) {
    console.error('Fetch failed:', err)
    process.exitCode = 1
  } finally {
    closeDatabase(db)
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| JSDOM for DOM parsing | linkedom | 2023-2024 | 3x faster, 1/3 memory usage; linkedom now preferred for server-side DOM |
| Custom readability heuristics | @extractus/article-extractor | 2024-2025 | Actively maintained wrapper over proven algorithms, handles sanitization + thresholds |
| fetch() with setTimeout | AbortSignal.timeout() | Node.js 18+ | Native timeout support, no manual cleanup needed |
| Manual promise queue | p-limit library | Mature ecosystem | Battle-tested concurrency control, 100M downloads/week |

**Deprecated/outdated:**
- **node-fetch polyfill**: Not needed in Node.js 18+; native fetch() is standard
- **request library**: Deprecated in 2020; use native fetch() or axios
- **Custom HTML regex parsing**: Never safe; always use DOM parser (cheerio/linkedom)

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | vitest 4.1.4 |
| Config file | `pipeline/vitest.config.js` |
| Quick run command | `npm test -- extractors/` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PROC-01 | Fetch full page content (arxiv, articles, general) | integration | `npm test -- extractors/strategy.test.ts -x` | ❌ Wave 0 |
| PROC-02 | Domain-aware routing (arxiv.org → arxiv extractor) | unit | `npm test -- extractors/strategy.test.ts::test_domain_routing -x` | ❌ Wave 0 |
| PROC-02 | ArXiv API returns structured metadata | integration | `npm test -- extractors/arxiv.test.ts -x` | ❌ Wave 0 |
| PROC-02 | Article extractor returns plain text content | integration | `npm test -- extractors/article.test.ts -x` | ❌ Wave 0 |
| PROC-03 | Content stored in separate table, deleted after use | unit | `npm test -- db/content-operations.test.ts -x` | ❌ Wave 0 |
| PROC-04 | Fetch command processes only status='written' | integration | `npm test -- commands/fetch.test.ts -x` | ❌ Wave 0 |
| PROC-04 | Idempotent re-run (status='content_fetched' skipped) | integration | `npm test -- commands/fetch.test.ts::test_idempotent -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test -- {modified-file}.test.ts -x` (run tests for changed module, fail fast)
- **Per wave merge:** `npm test` (full suite)
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/extractors/strategy.test.ts` — covers domain routing (PROC-02)
- [ ] `tests/extractors/arxiv.test.ts` — covers arXiv API integration (PROC-02)
- [ ] `tests/extractors/article.test.ts` — covers article extraction (PROC-02)
- [ ] `tests/extractors/general.test.ts` — covers enhanced meta fetcher (PROC-02)
- [ ] `tests/db/content-operations.test.ts` — covers content table CRUD (PROC-03)
- [ ] `tests/commands/fetch.test.ts` — covers CLI integration (PROC-01, PROC-04)
- [ ] Framework install: Already present (vitest 4.1.4 in pipeline/package.json)

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | no | N/A — no user authentication in content fetching |
| V3 Session Management | no | N/A — no sessions |
| V4 Access Control | no | N/A — processing local database only |
| V5 Input Validation | yes | Zod schema validation for extracted content structure (contentType enum, required fields) |
| V6 Cryptography | no | N/A — no sensitive data encryption needed |
| V10 Malicious Code | yes | Sanitize HTML before storage (use @extractus/article-extractor built-in sanitize-html) |
| V12 Files and Resources | yes | Timeout + concurrency limits prevent resource exhaustion (AbortSignal.timeout, p-limit) |
| V13 API and Web Services | yes | Rate limiting for external APIs (3s delay for arXiv, domain-specific limits) |
| V14 Configuration | yes | User-Agent header, timeout values, concurrency limits configurable |

### Known Threat Patterns for Content Extraction

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Malicious HTML/XSS | Tampering | @extractus/article-extractor uses sanitize-html to strip scripts/styles/dangerous tags |
| Resource exhaustion (memory bomb) | Denial of Service | p-limit caps concurrent fetches, AbortSignal.timeout prevents hung requests |
| SSRF via user-controlled URLs | Spoofing/Elevation | Blocklist prevents fetching internal IPs (127.0.0.1, localhost, 192.168.x.x, 10.x.x.x) |
| Rate limit violations | Denial of Service | Per-domain rate limiting (3s delay for arXiv, configurable per domain) |
| XML entity expansion (billion laughs) | Denial of Service | Use cheerio/linkedom with entity limit, avoid custom XML parsers |

**Critical controls:**

1. **HTML Sanitization:** NEVER store raw HTML from @extractus/article-extractor — always use the built-in sanitization or strip to plain text
2. **Timeout Enforcement:** EVERY fetch must have `AbortSignal.timeout(10000)` to prevent indefinite hangs
3. **Concurrency Limiting:** ALWAYS use p-limit to cap parallel fetches (default 5 max)
4. **SSRF Prevention:** Validate URL hostname before fetching — reject private IP ranges, localhost, internal domains

## Sources

### Primary (HIGH confidence)

- [arXiv API User's Manual](https://info.arxiv.org/help/api/user-manual.html) - API endpoint structure, query parameters, response format, rate limiting
- [@extractus/article-extractor GitHub](https://github.com/extractus/article-extractor) - Package usage, returned properties, linkedom dependency
- npm registry verification (2026-04-14):
  - @extractus/article-extractor 8.0.20 (published 2025-09-04)
  - linkedom 0.18.12 (published 2025-08-21)
  - p-limit 7.3.0 (published 2026-02-03)
  - @mozilla/readability 0.6.0 (published 2025-03-03)
  - jsdom 29.0.2 (published 2026-04-07)
- Existing codebase patterns:
  - `pipeline/src/generators/meta-fetcher.ts` - cheerio + fetch + timeout pattern
  - `pipeline/src/commands/generate.ts` - CLI command structure, db lifecycle
  - `pipeline/src/db/operations.ts` - getByStatus, updateStatus patterns
  - `pipeline/vitest.config.js` - test framework configuration

### Secondary (MEDIUM confidence)

- [MDN: AbortSignal.timeout()](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) - Timeout API documentation
- [p-limit vs p-queue vs Bottleneck comparison](https://www.pkgpulse.com/blog/p-limit-vs-p-queue-vs-bottleneck-concurrency-control-2026) - Concurrency control library comparison (2026)
- [Properly Designing fetch Timeouts and Retries in Node.js](https://tasukehub.com/articles/nodejs-fetch-timeout-retry-guide?lang=en) - Retry patterns with exponential backoff
- [LinkeDOM: A JSDOM Alternative](https://webreflection.medium.com/linkedom-a-jsdom-alternative-53dd8f699311) - Performance comparison
- [SQLite Temporary Storage](https://sqlite.org/tempfiles.html) - Ephemeral data patterns
- [How to Set Up SQLite for Production Use](https://oneuptime.com/blog/post/2026-02-02-sqlite-production-setup/view) - Production best practices (2026)

### Tertiary (LOW confidence)

None — all critical findings verified against official documentation or package registry.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - All packages verified against npm registry with publish dates, linkedom/p-limit confirmed as current best practices
- Architecture: HIGH - Strategy pattern standard for domain routing, ephemeral storage pattern validated against SQLite docs
- Pitfalls: HIGH - Derived from official documentation (arXiv rate limits, AbortSignal timeout handling) and codebase patterns (FK constraints)
- Security: MEDIUM - ASVS categories mapped to phase tech stack, mitigations based on library documentation (sanitize-html), but not penetration tested

**Research date:** 2026-04-14
**Valid until:** 2026-05-14 (30 days — stable domain with mature libraries)
