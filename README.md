# Second Brain

An automated knowledge capture system for macOS. It passively logs everything you browse during the day, then generates daily highlight pages in your Obsidian vault. Your browsing history becomes your external memory.

## How It Works

```
Chrome/Comet browser
    |
    v
[Browser Extension] -- passively captures URLs, titles, domains, timestamps
    |
    v  (native messaging)
[Export Pipeline]    -- pulls captures into local SQLite database
    |
    v
[Generate Pipeline] -- creates Obsidian-compatible daily notes from captures
    |
    v
~/Documents/Obsidian/second-brain/2026-04-10.md
```

**Three components:**

1. **Browser Extension** (`extension/`) -- A WXT-based Chrome/Comet extension that silently tracks page visits with dwell-time filtering (5s minimum), smart blocklist (Gmail, social media, banking filtered out), and a popup UI for pause/quick-block controls.

2. **CLI Pipeline** (`pipeline/`) -- A Node.js CLI (`second-brain`) with two commands:
   - `second-brain export` -- Pulls captures from the extension into a local SQLite database via Chrome Native Messaging
   - `second-brain generate` -- Reads captures from the database, fetches meta descriptions from pages, and writes Obsidian-compatible markdown daily notes

3. **Shared Types** (`shared/`) -- Zod schemas and TypeScript types shared between extension and pipeline.

## Prerequisites

- macOS
- Node.js >= 20
- npm >= 10
- Chrome and/or Comet browser

## Install

```bash
# Clone and install dependencies
git clone https://github.com/LEARNableLabs/second-brain.git
cd second-brain
npm install
```

### 1. Build and load the browser extension

```bash
# Build the extension
npm run build --workspace=extension

# Or run in dev mode with hot reload
npm run dev --workspace=extension
```

Load the unpacked extension in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select `extension/.output/chrome-mv3`
5. Copy the extension ID shown under "Second Brain Capture"

### 2. Set up native messaging (connects extension to CLI)

```bash
# Install the native messaging host manifest for Chrome/Comet
./pipeline/manifests/install-host.sh <your-extension-id>
```

Restart Chrome/Comet after installing.

### 3. Configure output directory (optional)

By default, daily notes are written to `~/Documents/Obsidian/second-brain/`. To change this:

```bash
mkdir -p ~/.second-brain
echo '{"outputDir": "/absolute/path/to/your/obsidian/vault"}' > ~/.second-brain/config.json
```

## Usage

### Browse normally

The extension captures pages automatically. It filters out noise (Gmail, Google Search, social media, banking) and requires a 5s dwell time before logging a visit. Use the popup to:
- Pause/resume capture
- Quick-block the current domain
- See capture stats

### Export captures to database

```bash
npx second-brain export
```

Pulls captured URLs from the browser extension into `~/.second-brain/data.db`.

### Generate daily notes

```bash
# Generate today's note
npx second-brain generate

# Generate for a specific date
npx second-brain generate --date 2026-04-10

# Preview without writing
npx second-brain generate --dry
```

Each daily note includes:
- YAML frontmatter (date, capture counts, top domains, browsers)
- Highlights section (placeholder for future AI curation)
- Browsing log grouped by domain with meta descriptions
- Source markers (star for manual saves, history suffix for backfills)

The output file is atomically written (safe while Obsidian is open) and auto-committed to a git repo in the output directory.

## Project Structure

```
second-brain/
  extension/          # Browser extension (WXT + TypeScript)
    components/       #   Storage, types, dwell tracking, blocklist
    entrypoints/      #   Background service worker, popup UI
    tests/            #   48 tests
  pipeline/           # CLI pipeline (Node.js + TypeScript)
    src/
      commands/       #   export, generate CLI commands
      config/         #   Config reader with Zod validation
      db/             #   SQLite connection, migrations, operations
      generators/     #   Markdown engine, frontmatter, meta fetcher, atomic writer
      git/            #   Auto-commit to output repo
      messaging/      #   Chrome Native Messaging protocol
    tests/            #   54 tests
  shared/             # Shared Zod schemas and types
    src/
    tests/
```

## Development

```bash
# Run all tests
npm test

# Run tests for a specific workspace
npm test --workspace=extension
npm test --workspace=pipeline

# Type check
npm run type-check --workspace=extension
```

## Roadmap

Built in phases -- see `.planning/ROADMAP.md` for full details.

- [x] Phase 1: Browser Extension Foundation
- [x] Phase 2: Data Export Pipeline
- [x] Phase 3: Daily Note Generation
- [ ] Phase 4: Content Processing (full page content fetching)
- [ ] Phase 5: AI Curation (summaries, topic clustering, wikilinks)
- [ ] Phase 6: Automation (hourly launchd scheduling)
- [ ] Phase 7: Conversation Capture & Email Delivery
