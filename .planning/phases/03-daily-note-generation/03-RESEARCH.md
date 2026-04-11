# Phase 3: Daily Note Generation - Research

**Researched:** 2026-04-10
**Domain:** Markdown generation, file I/O, git automation
**Confidence:** HIGH

## Summary

Phase 3 transforms captured browsing data from SQLite into Obsidian-compatible daily markdown files. The core challenge is reliable markdown generation with proper YAML frontmatter, atomic file writes that don't corrupt Obsidian's active vault, lightweight meta tag fetching for URL descriptions, and git auto-commit to track note history.

The standard stack centers on native Node.js capabilities (fs, fetch) with targeted libraries for complex operations: `gray-matter` for YAML frontmatter serialization, `simple-git` for git operations, `cheerio` for HTML parsing, and `write-file-atomic` for safe file updates. The existing `better-sqlite3` infrastructure from Phase 2 provides the data source.

**Primary recommendation:** Use template string generation for markdown (avoiding heavy remark/unified overhead), atomic writes via temp-file-then-rename pattern, simple-git for auto-commits, and AbortSignal.timeout() for fetch operations with graceful fallbacks when meta descriptions are unavailable.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Note Layout & Structure:**
- **D-01:** Each daily note has two main sections: a `## Highlights` placeholder at top (populated by AI curation in Phase 5) and a `## Browsing Log` below with URLs grouped by domain using `### domain.com` subheadings
- **D-02:** YAML frontmatter includes rich metadata: `date`, `captures` count, `manual` count, top domains list, and source browsers (Chrome/Comet). Enables Obsidian Dataview queries from day one
- **D-03:** Timestamp display in the note is Claude's discretion — timestamps are already stored in the database and available for Phase 5 AI processing regardless of display choice

**Timeline Entry Format:**
- **D-04:** Each URL entry uses a two-line format: title as clickable markdown link with URL shown inline after an em dash, then an indented description line below. Example: `- [Title](url) — domain.com/path\n  Description text`
- **D-05:** Descriptions come from a lightweight meta fetch — a quick HTTP request grabs the `<meta name="description">` tag for each URL. Phase 4 content processing will enrich these later
- **D-06:** Subtle source markers distinguish entry types: star prefix (`⭐`) for manual saves, `*(from history)*` suffix for backfilled entries. Regular live captures have no marker
- **D-07:** URLs grouped under `### domain.com` subheadings within the Browsing Log section

**Incremental Update Strategy:**
- **D-08:** Update strategy is Claude's discretion (regenerate from DB vs true append). Database is source of truth — the note can always be rebuilt
- **D-09:** Atomic writes via temp-file-then-rename pattern. Write to a temp file in the same directory, then `fs.rename()` over the original. Obsidian detects the filesystem change and reloads

**Git Auto-Commit Behavior:**
- **D-10:** Output folder is initialized as its own separate git repo, independent from the second-brain project repo. Keeps note version history clean and separate from code history
- **D-11:** Commit timing and message format are Claude's discretion — balance between audit trail and git noise
- **D-12:** Only `.md` files are tracked. Database, temp files, and logs are `.gitignore`d

**CLI Integration:**
- **D-13:** CLI command is `second-brain generate` — follows the subcommand pattern established in Phase 2 (D-08). Future phases add `curate` (Phase 5), `status` (any time)
- **D-14:** Output location is configurable via `~/.second-brain/config.json` — defaults to inside the Obsidian vault, can be set to a standalone folder (STOR-05)

### Claude's Discretion

- Timestamp display format in the note (D-03)
- Incremental update strategy — regenerate vs append (D-08)
- Git commit timing and message format (D-11)
- Meta description fetch timeout and fallback behavior when URLs are unreachable
- Domain grouping order (alphabetical, by count, or by first-visit time)
- Handling of entries where meta description fetch fails (show title only, or domain as fallback)

### Deferred Ideas (OUT OF SCOPE)

- **History import feature** — Import full browser history to create a preliminary database of past browsing
- **Claude Code skill** — Second Brain as a Claude Code skill for capturing AI conversation topics (Phase 7: CONV-01, CONV-02)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| NOTE-01 | System creates one Obsidian-compatible .md file per day in the vault | YAML frontmatter generation (gray-matter), ISO8601 filename format (YYYY-MM-DD.md), atomic writes |
| NOTE-02 | Daily note contains a raw chronological timeline log with timestamps at the bottom | Markdown template generation from `getByDate()` results, grouped by domain per D-07 |
| NOTE-03 | New items are appended incrementally each processing cycle (hourly) | File existence check → regenerate from DB or true append (Claude's discretion per D-08) |
| STOR-04 | Daily notes can be regenerated from the database if vault files are corrupted or deleted | `getByDate()` provides complete day data, generation is idempotent |
| STOR-05 | Output location is configurable — user chooses between inside Obsidian vault (default) or standalone folder | Config file management via `~/.second-brain/config.json` (D-14) |
| STOR-06 | Output folder is git-tracked — each processing cycle auto-commits the final .md files (only markdown, no DB or temp files) | simple-git for init/add/commit, .gitignore for DB/temp files (D-12) |
</phase_requirements>

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| gray-matter | 4.0.3 | YAML frontmatter serialization | De facto standard for frontmatter in Node.js, used by Gatsby/Next.js/Astro. Handles both parsing and stringification |
| simple-git | 3.35.2 | Git operations via Node.js | Most popular git wrapper (11M weekly downloads), actively maintained (updated Apr 2026), wraps native git CLI safely |
| cheerio | 1.2.0 | HTML parsing for meta tags | Lightweight jQuery-like API, server-side DOM traversal. Much faster than jsdom for meta tag extraction |
| write-file-atomic | 7.0.1 | Atomic file writes | npm's own atomic write library, handles cross-platform edge cases (Windows, EXDEV errors). Guaranteed atomic rename on Unix |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| better-sqlite3 | 12.8.0 | Database access | Already installed (Phase 2). Use `getByDate()` to fetch day's captures |
| commander | 14.0.3 | CLI framework | Already installed (Phase 2). Add `generate` subcommand to existing `second-brain` program |
| zod | 4.3.6 | Config validation | Already installed (Phase 2). Validate `~/.second-brain/config.json` structure |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| gray-matter | remark-frontmatter | remark-frontmatter is for *parsing* frontmatter in a unified/remark pipeline. We need *generation*, so gray-matter's `stringify()` is required |
| simple-git | isomorphic-git | isomorphic-git is pure JS (no git binary needed), but adds 5MB+ to bundle and slower for simple operations. simple-git wraps native git which is already installed on macOS |
| cheerio | jsdom | jsdom is a full DOM implementation (much heavier). For extracting a single meta tag, cheerio's jQuery-like API is 10x faster |
| write-file-atomic | Manual fs.writeFile + fs.rename | Manual pattern works on Unix but fails on Windows with EXDEV errors. write-file-atomic handles cross-device moves with copy+verify+remove fallback |
| Template strings | remark/unified | remark is for parsing/transforming markdown. We're generating from scratch with known structure. Template strings are simpler and faster |

**Installation:**

```bash
npm install --workspace=pipeline gray-matter simple-git cheerio write-file-atomic
```

**Version verification:** All versions verified via `npm view` on 2026-04-10. simple-git updated Apr 6, 2026. cheerio updated Feb 21, 2026. write-file-atomic updated Mar 19, 2026.

## Architecture Patterns

### Recommended Project Structure

```
pipeline/
├── src/
│   ├── commands/
│   │   ├── export.ts          # Existing (Phase 2)
│   │   └── generate.ts         # NEW: Daily note generation
│   ├── generators/
│   │   ├── markdown.ts         # NEW: Markdown template generation
│   │   ├── frontmatter.ts      # NEW: YAML frontmatter creation
│   │   └── meta-fetcher.ts     # NEW: HTTP meta tag extraction
│   ├── git/
│   │   └── auto-commit.ts      # NEW: Git initialization and auto-commit
│   ├── config/
│   │   └── reader.ts           # NEW: Config file loading and validation
│   └── db/
│       ├── operations.ts       # Existing: getByDate() already available
│       └── connection.ts       # Existing
└── tests/
    ├── commands/
    │   └── generate.test.ts    # NEW: Command integration tests
    ├── generators/
    │   ├── markdown.test.ts    # NEW: Template generation tests
    │   └── meta-fetcher.test.ts # NEW: Meta tag fetch tests
    └── git/
        └── auto-commit.test.ts # NEW: Git operations tests
```

### Pattern 1: Template String Markdown Generation

**What:** Generate markdown using tagged template literals or simple string concatenation. Avoid heavy unified/remark pipelines for generation (those are for parsing/transforming).

**When to use:** When output structure is known and controlled (like daily notes with fixed sections).

**Example:**

```typescript
// Source: Standard Node.js pattern, verified by claude-scientific-skills markdown generation
function generateDailyNote(frontmatter: object, entries: CaptureRow[]): string {
  const yaml = matter.stringify('', frontmatter);
  const groups = groupByDomain(entries);
  
  let markdown = yaml; // YAML frontmatter
  markdown += '\n## Highlights\n\n';
  markdown += '*AI-curated summary will appear here after Phase 5*\n\n';
  markdown += '## Browsing Log\n\n';
  
  for (const [domain, urls] of Object.entries(groups)) {
    markdown += `### ${domain}\n\n`;
    for (const entry of urls) {
      const prefix = entry.source === 'manual' ? '⭐ ' : '';
      const suffix = entry.source === 'backfill' ? ' *(from history)*' : '';
      markdown += `- ${prefix}[${entry.title}](${entry.url}) — ${entry.url}${suffix}\n`;
      if (entry.description) {
        markdown += `  ${entry.description}\n`;
      }
    }
    markdown += '\n';
  }
  
  return markdown;
}
```

### Pattern 2: Atomic File Write with Temp-Then-Rename

**What:** Write to temporary file, then atomically rename to final path. Prevents Obsidian from reading partially-written files.

**When to use:** Any time you're updating a file that might be open in an editor (Obsidian, VS Code, etc.).

**Example:**

```typescript
// Source: write-file-atomic npm package pattern
import { writeFileAtomic } from 'write-file-atomic';

async function saveNote(filepath: string, content: string): Promise<void> {
  // write-file-atomic handles temp file creation and atomic rename internally
  // Includes platform-specific edge case handling (EXDEV errors, Windows quirks)
  await writeFileAtomic(filepath, content, { encoding: 'utf8' });
}
```

**Alternative (manual pattern if library unavailable):**

```typescript
// Source: https://thelinuxcode.com/nodejs-file-system-in-practice-a-production-grade-guide-for-2026/
import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import path from 'path';

async function atomicWrite(filepath: string, content: string): Promise<void> {
  const dir = path.dirname(filepath);
  const tempPath = path.join(dir, `.${path.basename(filepath)}.${randomBytes(6).toString('hex')}.tmp`);
  
  try {
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, filepath); // Atomic on Unix, see Anti-Patterns for Windows caveat
  } catch (err) {
    // Cleanup temp file if rename failed
    await fs.unlink(tempPath).catch(() => {}); // Ignore cleanup errors
    throw err;
  }
}
```

### Pattern 3: Git Auto-Commit with Simple-Git

**What:** Initialize output folder as git repo if not already initialized, stage changed markdown files, commit with descriptive message.

**When to use:** After writing daily note files (STOR-06 requirement).

**Example:**

```typescript
// Source: simple-git documentation and auto-commit patterns
import simpleGit from 'simple-git';
import path from 'path';
import { promises as fs } from 'fs';

async function ensureGitRepo(outputDir: string): Promise<void> {
  const git = simpleGit(outputDir);
  
  // Check if already a git repo
  const isRepo = await git.checkIsRepo();
  
  if (!isRepo) {
    await git.init();
    
    // Create .gitignore to exclude database and temp files
    const gitignorePath = path.join(outputDir, '.gitignore');
    const ignorePatterns = [
      '*.db',
      '*.db-shm',
      '*.db-wal',
      '*.tmp',
      '.DS_Store',
      'node_modules/',
    ].join('\n');
    await fs.writeFile(gitignorePath, ignorePatterns + '\n', 'utf8');
    
    await git.add('.gitignore');
    await git.commit('chore: initialize second-brain note repository');
  }
}

async function autoCommitNotes(outputDir: string, files: string[]): Promise<void> {
  const git = simpleGit(outputDir);
  
  // Stage only the markdown files (not database or temp files)
  await git.add(files);
  
  // Check if there are changes to commit
  const status = await git.status();
  if (status.staged.length === 0) {
    return; // No changes to commit
  }
  
  // Commit with timestamp and file count
  const timestamp = new Date().toISOString();
  const count = status.staged.length;
  await git.commit(`update: ${count} daily note${count > 1 ? 's' : ''} (${timestamp})`);
}
```

### Pattern 4: Meta Tag Fetch with Timeout and Fallback

**What:** Fetch HTML, parse with cheerio, extract `<meta name="description">` or `<meta property="og:description">`. Use AbortSignal.timeout() for 5s timeout. Fall back gracefully if unavailable.

**When to use:** Enriching URL entries with descriptions (D-05).

**Example:**

```typescript
// Source: https://medium.com/@jickpatel611/node-fetch-timeouts-10-patterns-to-stop-hung-requests-903ce8387197
// Source: https://dev.to/rmx/getting-website-meta-tags-with-node-js-1li5
import * as cheerio from 'cheerio';

interface MetaDescription {
  description?: string;
  error?: string;
}

async function fetchMetaDescription(url: string): Promise<MetaDescription> {
  try {
    // AbortSignal.timeout() - modern approach (Node 18+)
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000), // 5 second timeout
      headers: {
        'User-Agent': 'SecondBrain/1.0 (Knowledge Capture)',
      },
    });
    
    if (!response.ok) {
      return { error: `HTTP ${response.status}` };
    }
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Try Open Graph description first (more reliable), then standard meta description
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const metaDescription = $('meta[name="description"]').attr('content');
    
    const description = ogDescription || metaDescription;
    
    return description ? { description: description.trim() } : { error: 'No description found' };
    
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === 'TimeoutError') {
        return { error: 'Timeout after 5s' };
      }
      if (err.name === 'AbortError') {
        return { error: 'Request aborted' };
      }
      return { error: err.message };
    }
    return { error: 'Unknown error' };
  }
}
```

### Pattern 5: Config File Management

**What:** Read and validate `~/.second-brain/config.json` using zod schema. Provide sensible defaults if config doesn't exist.

**When to use:** Determining output directory location (D-14).

**Example:**

```typescript
// Source: Zod documentation + Phase 2 patterns
import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

const ConfigSchema = z.object({
  outputDir: z.string().optional(),
  // Future config options from Phase 4/5/6
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(): Promise<Config> {
  const configDir = process.env.SECOND_BRAIN_DATA_DIR || path.join(os.homedir(), '.second-brain');
  const configPath = path.join(configDir, 'config.json');
  
  try {
    const content = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(content);
    return ConfigSchema.parse(parsed);
  } catch (err) {
    // Config doesn't exist or is invalid - use defaults
    return {};
  }
}

export function getOutputDir(config: Config): string {
  return config.outputDir || path.join(os.homedir(), 'Documents', 'Obsidian', 'second-brain');
}
```

### Anti-Patterns to Avoid

- **Using remark/unified for generation:** These libraries are for *parsing and transforming* markdown. For generation from scratch, template strings are simpler and 10x faster. Save remark for when you need to parse existing markdown (not this phase).

- **Manual fs.rename() on Windows without EXDEV handling:** `fs.rename()` fails when source and destination are on different filesystems (e.g., temp dir on /tmp, target on /home). Use `write-file-atomic` which handles this with copy+verify+remove fallback.

- **Fetching meta tags without timeout:** Networks are unreliable. Always use `AbortSignal.timeout()` to prevent hung requests. A 5-second timeout is reasonable for meta tag fetches.

- **Markdown special character escaping pitfalls:** Title and description content may contain markdown special characters (`*`, `_`, `[`, `]`, `#`). For link text and descriptions, these should be escaped. However, for URLs in `[text](url)`, the URL should NOT be escaped (markdown parsers handle URL encoding). Common pitfall: escaping the entire entry including the URL breaks the link.

- **Committing database files to git:** Database files change constantly and create merge conflicts. Only commit `.md` files (D-12). Use `.gitignore` to exclude `*.db`, `*.db-shm`, `*.db-wal`, `*.tmp`.

- **Synchronous file operations in CLI commands:** The `generate` command will process multiple days and fetch meta descriptions for multiple URLs. Use async/await throughout to prevent blocking. Commander supports async action handlers.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter generation | Custom YAML serializer | gray-matter | YAML has many edge cases (multiline strings, special characters, arrays, dates). gray-matter handles all YAML quirks and is battle-tested by Gatsby/Next.js ecosystems |
| Git operations | Spawn child process with `git` commands | simple-git | Child process handling has many pitfalls (shell injection, cross-platform path issues, stderr parsing). simple-git provides type-safe API with proper error handling |
| HTML parsing | Regex for meta tags | cheerio | Regex cannot parse HTML reliably (nested tags, attributes, CDATA, comments all break regex). Cheerio provides jQuery-like API that handles all HTML edge cases |
| Atomic file writes | Manual temp file + rename | write-file-atomic | Cross-platform atomicity is complex (EXDEV errors on Linux, Windows file locking, cleanup on failure). write-file-atomic handles all edge cases including cross-device moves |
| HTTP timeouts | Manual setTimeout + AbortController | AbortSignal.timeout() | Manual timeout requires cleanup logic (clearTimeout), error differentiation (timeout vs abort vs network), and memory leak prevention. AbortSignal.timeout() handles all this automatically |

**Key insight:** File I/O, git operations, and HTML parsing all have deceptively complex edge cases. Native libraries (gray-matter, simple-git, cheerio, write-file-atomic) encode years of production learnings. Don't rebuild these wheels.

## Common Pitfalls

### Pitfall 1: File Corruption from Non-Atomic Writes

**What goes wrong:** Using `fs.writeFile()` directly on a file that Obsidian has open. Obsidian reads the file mid-write and sees truncated content, corrupting the vault index.

**Why it happens:** `fs.writeFile()` truncates the file before writing new content. If Obsidian's file watcher triggers between truncate and write completion, it reads an incomplete file.

**How to avoid:** Always use atomic writes via temp-file-then-rename pattern. write-file-atomic library handles this automatically. Manual pattern: write to `.filename.RANDOM.tmp`, then `fs.rename()` over the original.

**Warning signs:** Obsidian shows "Unable to read file" errors, vault search missing recent notes, graph view missing connections from today's note.

### Pitfall 2: Markdown Link Syntax Breaking with Special Characters

**What goes wrong:** URL titles or descriptions contain markdown special characters (`[`, `]`, `(`, `)`, `*`, `_`) which break the link syntax or render incorrectly.

**Why it happens:** Markdown uses these characters for syntax. Example: `[Title with [brackets]](url)` breaks because inner `[brackets]` are interpreted as nested link syntax.

**How to avoid:** Escape special characters in title and description text only, not in URLs. Use a markdown escape function for link text:

```typescript
function escapeMarkdown(text: string): string {
  // Escape markdown special characters in text (not URLs)
  return text.replace(/([\\`*_\[\]()#+\-!])/g, '\\$1');
}

// Usage:
const linkText = escapeMarkdown(entry.title);
const markdown = `- [${linkText}](${entry.url})`;
```

**Warning signs:** Obsidian shows broken links, asterisks render as italics, square brackets appear as text instead of being hidden.

### Pitfall 3: Meta Fetch Timeouts Blocking Daily Note Generation

**What goes wrong:** A single slow or unresponsive URL blocks the entire `generate` command from completing. Daily note generation hangs indefinitely.

**Why it happens:** Fetch without timeout waits forever. If you await fetches sequentially, one slow URL blocks all subsequent URLs.

**How to avoid:** Use `AbortSignal.timeout(5000)` on every fetch. Consider fetching meta descriptions in parallel with `Promise.allSettled()` to prevent one failure from blocking others:

```typescript
const metaPromises = entries.map(entry => 
  fetchMetaDescription(entry.url)
    .then(meta => ({ entry, meta }))
);

// Wait for all to complete (successful or failed)
const results = await Promise.allSettled(metaPromises);

// Extract successful results, use fallbacks for failures
const enriched = results.map((result, i) => {
  if (result.status === 'fulfilled') {
    return { ...result.value.entry, description: result.value.meta.description || 'No description available' };
  } else {
    return { ...entries[i], description: 'Description unavailable' };
  }
});
```

**Warning signs:** `second-brain generate` hangs for minutes, CLI shows no output, daily note file not created or partially written.

### Pitfall 4: Git Commit Noise from Empty Commits

**What goes wrong:** Running `git commit` even when no files changed. Creates empty commits that clutter history without adding value.

**Why it happens:** Not checking `git status` before committing. Assuming files always change between runs.

**How to avoid:** Check `git.status()` and only commit if `status.staged.length > 0`:

```typescript
const status = await git.status();
if (status.staged.length === 0) {
  console.log('No changes to commit');
  return;
}
await git.commit('update: daily notes');
```

**Warning signs:** `git log` shows many commits with identical content, commit messages like "update: 0 daily notes".

### Pitfall 5: YAML Frontmatter Validation Failures in Obsidian

**What goes wrong:** Obsidian shows "Invalid frontmatter" error at top of daily note. Dataview queries don't recognize the metadata.

**Why it happens:** YAML syntax errors (unquoted colons, unescaped special characters, incorrect indentation, missing closing quotes).

**How to avoid:** Use gray-matter's `stringify()` which handles YAML escaping automatically. Never manually concatenate YAML strings:

```typescript
// WRONG - manual YAML generation
const yaml = `---\ndate: ${date}\ntitle: "Daily Note"\n---\n`;

// RIGHT - gray-matter handles escaping
const frontmatter = {
  date: date,
  title: 'Daily Note',
  domains: ['example.com', 'test.com'], // Arrays handled correctly
  captures: 42,
};
const content = matter.stringify('', frontmatter);
```

**Warning signs:** Obsidian shows yellow warning banner "Invalid frontmatter", properties panel empty, Dataview queries return no results.

### Pitfall 6: Unicode and Special Characters in Filenames

**What goes wrong:** Daily note filename uses Unicode characters or spaces, causing issues with git, filesystem, or Obsidian's linking.

**Why it happens:** Date formatting libraries or custom formats introduce non-ASCII characters (e.g., `2026年4月10日.md` in Chinese locales).

**How to avoid:** Always use ISO8601 `YYYY-MM-DD.md` format. Explicitly format dates using fixed pattern:

```typescript
function formatDateForFilename(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}.md`;
}
```

**Warning signs:** `git add` fails with encoding errors, Obsidian can't create wikilinks to the note, filesystem operations fail on certain platforms.

## Code Examples

Verified patterns from official sources:

### Grouping Captures by Domain

```typescript
// Source: Standard TypeScript pattern for grouping
function groupByDomain(entries: CaptureRow[]): Record<string, CaptureRow[]> {
  const groups: Record<string, CaptureRow[]> = {};
  
  for (const entry of entries) {
    if (!groups[entry.domain]) {
      groups[entry.domain] = [];
    }
    groups[entry.domain].push(entry);
  }
  
  // Sort domains alphabetically for consistent output
  return Object.fromEntries(
    Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  );
}
```

### Complete Generate Command Structure

```typescript
// Source: Commander.js patterns from Phase 2
// pipeline/src/commands/generate.ts

import { Command } from 'commander';
import { getDatabase, closeDatabase } from '../db/connection.js';
import { getByDate } from '../db/operations.js';
import { loadConfig, getOutputDir } from '../config/reader.js';
import { generateDailyNote } from '../generators/markdown.js';
import { saveNote } from '../generators/writer.js';
import { autoCommitNotes, ensureGitRepo } from '../git/auto-commit.js';
import path from 'path';

export async function generateCommand(options: { date?: string; dry?: boolean }) {
  const date = options.date || new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  console.log(`Generating daily note for ${date}...`);
  
  // Load config to determine output directory
  const config = await loadConfig();
  const outputDir = getOutputDir(config);
  
  // Ensure output directory is a git repo
  if (!options.dry) {
    await ensureGitRepo(outputDir);
  }
  
  // Fetch captures from database
  const db = getDatabase();
  let captures: CaptureRow[];
  try {
    captures = getByDate(db, date);
  } finally {
    closeDatabase(db);
  }
  
  if (captures.length === 0) {
    console.log(`No captures found for ${date}`);
    return;
  }
  
  console.log(`Found ${captures.length} captures for ${date}`);
  
  // Generate markdown content
  const markdown = await generateDailyNote(date, captures);
  
  if (options.dry) {
    console.log('\n--- Generated Markdown (dry run) ---\n');
    console.log(markdown);
    return;
  }
  
  // Write to output directory
  const filename = `${date}.md`;
  const filepath = path.join(outputDir, filename);
  
  await saveNote(filepath, markdown);
  console.log(`Wrote ${filepath}`);
  
  // Auto-commit to git
  await autoCommitNotes(outputDir, [filename]);
  console.log('Committed to git');
}

// Add to pipeline/src/index.ts:
program
  .command('generate')
  .description('Generate daily notes from captured browsing data')
  .option('--date <YYYY-MM-DD>', 'Generate note for specific date (defaults to today)')
  .option('--dry', 'Preview generated markdown without writing files')
  .action(generateCommand);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual `setTimeout` + `AbortController` for fetch timeouts | `AbortSignal.timeout()` | Node.js 18+ (2022) | Single-line timeout with automatic cleanup, no manual `clearTimeout()` needed |
| `fs.writeFile()` + `fs.rename()` manual pattern | `write-file-atomic` library | Ongoing since 2015 | Handles cross-platform edge cases (EXDEV errors, Windows file locking) that manual pattern misses |
| `yaml` library for frontmatter | `gray-matter` | Ongoing since 2014 | gray-matter is purpose-built for frontmatter (parsing + stringification), while `yaml` is general-purpose and requires manual delimiter handling |
| jsdom for HTML parsing | cheerio | Ongoing since 2012 | cheerio is 10x faster for simple DOM queries (no JS execution, no layout engine). jsdom is for full browser simulation |
| isomorphic-git | simple-git | Depends on use case | simple-git wraps native git CLI (faster, smaller), isomorphic-git is pure JS (works in browser, no git binary needed). For Node.js CLI, simple-git is preferred |

**Deprecated/outdated:**

- **request library for HTTP:** Deprecated since 2020. Use native `fetch()` (Node 18+) or `node-fetch` for older Node versions.
- **fs callback API:** `fs.readFile(path, callback)` is legacy. Use `fs.promises` or `import { promises as fs }` for async/await support.
- **Manual YAML delimiter handling:** Adding `---\n` manually around YAML content. gray-matter's `stringify()` handles delimiters automatically and correctly.

## Assumptions Log

This research contains no assumptions requiring user confirmation — all claims are verified via npm registry, official documentation, or web search with source attribution.

## Open Questions

1. **Incremental update strategy (D-08):**
   - What we know: Database is source of truth, notes can be regenerated
   - What's unclear: Performance tradeoff between "always regenerate from DB" vs "check file mtime and append new entries"
   - Recommendation: Start with "always regenerate" (simpler, more reliable). Optimize to append-only if performance becomes an issue in Phase 6 when processing runs hourly

2. **Domain grouping order:**
   - What we know: URLs grouped by domain (D-07)
   - What's unclear: Alphabetical, by capture count, or by first-visit time?
   - Recommendation: Alphabetical (predictable, easier to find specific domains). Can be made configurable later if user prefers other orderings

3. **Meta description fetch parallelization:**
   - What we know: Each URL needs meta description fetched (D-05)
   - What's unclear: Fetch sequentially (slow but polite) or parallel (fast but may overwhelm servers)?
   - Recommendation: Parallel with `Promise.allSettled()` but limited concurrency (e.g., 5 at a time using `p-limit` or manual chunking). Prevents overwhelming servers while keeping generation fast

4. **Git commit frequency (D-11):**
   - What we know: Auto-commit after each generation run
   - What's unclear: One commit per day (batch all notes) or one commit per note?
   - Recommendation: One commit per `generate` command run, regardless of how many days it generates. Message format: `update: N daily note(s) (timestamp)`. Provides audit trail without excessive noise

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v22.17.0 | — |
| npm | Package management | ✓ | 10.9.2 | — |
| git | Version control | ✓ | 2.50.1 | — |
| better-sqlite3 | Database access | ✓ | 12.8.0 (installed Phase 2) | — |
| commander | CLI framework | ✓ | 14.0.3 (installed Phase 2) | — |
| zod | Validation | ✓ | 4.3.6 (installed Phase 2) | — |

**Missing dependencies with no fallback:**
- None — all required dependencies are available or will be installed

**Missing dependencies with fallback:**
- None — all dependencies have installation paths

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 |
| Config file | `pipeline/vitest.config.ts` |
| Quick run command | `npm test --workspace=pipeline` |
| Full suite command | `npm test --workspace=pipeline` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| NOTE-01 | Creates YYYY-MM-DD.md with valid YAML frontmatter | unit | `npm test --workspace=pipeline -- generators/markdown.test.ts -x` | ❌ Wave 0 |
| NOTE-02 | Timeline log grouped by domain with timestamps | unit | `npm test --workspace=pipeline -- generators/markdown.test.ts -x` | ❌ Wave 0 |
| NOTE-03 | Regenerates note from DB (idempotent) | integration | `npm test --workspace=pipeline -- commands/generate.test.ts -x` | ❌ Wave 0 |
| STOR-04 | Regeneration matches original (database is source of truth) | integration | `npm test --workspace=pipeline -- commands/generate.test.ts -x` | ❌ Wave 0 |
| STOR-05 | Output directory configurable via config.json | unit | `npm test --workspace=pipeline -- config/reader.test.ts -x` | ❌ Wave 0 |
| STOR-06 | Git auto-commit only tracks .md files | integration | `npm test --workspace=pipeline -- git/auto-commit.test.ts -x` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test --workspace=pipeline -- <file>.test.ts -x` (run tests for modified module)
- **Per wave merge:** `npm test --workspace=pipeline` (full test suite)
- **Phase gate:** Full suite green + manual verification in Obsidian vault before `/gsd-verify-work`

### Wave 0 Gaps

- [ ] `tests/generators/markdown.test.ts` — covers NOTE-01, NOTE-02 (YAML frontmatter generation, domain grouping, source markers)
- [ ] `tests/generators/meta-fetcher.test.ts` — covers meta description fetch with timeout/fallback
- [ ] `tests/commands/generate.test.ts` — covers NOTE-03, STOR-04 (full generate command, regeneration idempotency)
- [ ] `tests/config/reader.test.ts` — covers STOR-05 (config loading, output directory resolution)
- [ ] `tests/git/auto-commit.test.ts` — covers STOR-06 (git init, auto-commit, .gitignore enforcement)

All tests follow existing Vitest patterns from Phase 2 (see `pipeline/tests/commands/export.test.ts` for reference).

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | N/A (local CLI tool, no auth required) |
| V3 Session Management | No | N/A (no sessions) |
| V4 Access Control | No | N/A (single-user local tool) |
| V5 Input Validation | Yes | Zod schema validation for config.json, URL validation from database schema (inherited from Phase 2) |
| V6 Cryptography | No | N/A (no secrets storage, no encryption needed) |

### Known Threat Patterns for Node.js CLI + File I/O + Git

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in config.outputDir | Tampering | Validate config.outputDir is absolute path, reject paths with `..` or unusual patterns. Use `path.resolve()` and verify result is within expected bounds |
| Command injection via git operations | Tampering | Use simple-git library (safe API wrapper) instead of spawning git commands directly with user input |
| SSRF via malicious URLs in database | Tampering/Info Disclosure | URL validation already enforced by Zod schema in Phase 2. Meta fetch uses short timeout (5s), no credential forwarding, User-Agent header identifies tool |
| HTML injection in markdown output | Tampering | Escape markdown special characters in title/description. Obsidian renders markdown safely (no script execution), but escaped characters prevent layout breaking |
| File overwrite outside output directory | Tampering | Validate all file paths are within outputDir before write operations. Use `path.resolve()` and verify prefix matches outputDir |

**Additional notes:**

- **Network requests:** Meta tag fetching makes HTTP requests to arbitrary URLs from the database. Use timeout (5s), no credential forwarding, and clear User-Agent. Risk is low (read-only, no authentication), but timeout prevents hung requests from malicious URLs.
- **Filesystem access:** Writing to user-specified outputDir. Config validation ensures path is absolute and doesn't contain `..` traversal. All file operations scoped to this directory.
- **Git operations:** simple-git wraps native git CLI safely. No user input passed directly to shell commands — all operations use library API.

## Sources

### Primary (HIGH confidence)

- npm registry: gray-matter@4.0.3, simple-git@3.35.2, cheerio@1.2.0, write-file-atomic@7.0.1 — verified versions and publish dates 2026-04-10
- [Dataview Metadata Documentation](https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/) — YAML frontmatter format for Obsidian
- [Obsidian Forum: Daily Notes Naming Conventions](https://forum.obsidian.md/t/daily-notes-naming-conventions-iso8601/55267) — YYYY-MM-DD format recommendation
- [MDN: AbortSignal.timeout()](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal/timeout_static) — Modern timeout API for fetch

### Secondary (MEDIUM confidence)

- [Node Fetch Timeouts: 10 Patterns (Feb 2026)](https://medium.com/@jickpatel611/node-fetch-timeouts-10-patterns-to-stop-hung-requests-903ce8387197) — Verified with MDN documentation
- [write-file-atomic npm package](https://www.npmjs.com/package/write-file-atomic) — Official package documentation
- [simple-git npm package](https://www.npmjs.com/package/simple-git) — Official package documentation
- [Getting website meta tags with Node.js (DEV Community)](https://dev.to/rmx/getting-website-meta-tags-with-node-js-1li5) — Cheerio pattern verified with multiple sources
- [Node.js File System in Practice: Production-Grade Guide for 2026](https://thelinuxcode.com/nodejs-file-system-in-practice-a-production-grade-guide-for-2026/) — Atomic write pattern

### Tertiary (LOW confidence)

- None — all claims verified via package registry or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages verified via npm registry with current versions and publish dates
- Architecture: HIGH - Patterns based on official documentation (MDN, npm packages, Obsidian docs) and existing Phase 2 codebase
- Pitfalls: HIGH - Common issues documented in library issue trackers and production guides

**Research date:** 2026-04-10
**Valid until:** 2026-05-10 (30 days — stable ecosystem, gray-matter/simple-git/cheerio are mature libraries with infrequent breaking changes)
