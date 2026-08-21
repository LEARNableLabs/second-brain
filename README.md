<p align="center">
  <img src="assets/second_brain_logo.png" alt="Second Brain logo" width="200">
</p>

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
[Export]             -- pulls captures into local SQLite database
    |
    v
[Generate]          -- creates Obsidian-compatible daily notes
    |
    v
[Fetch]             -- extracts full page content (arxiv API, article extraction)
    |
    v
[Curate]            -- AI generates topic clusters, summaries, [[wikilinks]]
    |
    v
~/Documents/Obsidian/second-brain/2026-04-14.md + morning email digest
```

**Three components:**

1. **Browser Extension** (`extension/`) -- A WXT-based Chrome/Comet extension that silently tracks page visits with dwell-time filtering (5s minimum), smart blocklist (Gmail, social media, banking filtered out), and a popup UI for pause/quick-block controls.

2. **CLI Pipeline** (`pipeline/`) -- A Node.js CLI (`second-brain`) with seven commands:
   - `second-brain export` -- Pulls captures from the extension into SQLite via Chrome Native Messaging
   - `second-brain generate` -- Writes Obsidian-compatible markdown daily notes from captures
   - `second-brain fetch` -- Extracts full page content (arxiv API, article extraction, enhanced meta)
   - `second-brain curate` -- AI-generates summaries with topic clustering and [[wikilinks]]
   - `second-brain capture-conversation` -- Logs Claude Code conversation topics to daily note
   - `second-brain email` -- Sends morning email digest via Gmail/gws
   - `second-brain search` -- Full-text search across captures and daily notes

3. **Shared Types** (`shared/`) -- Zod schemas and TypeScript types shared between extension and pipeline.

## Prerequisites

- macOS (launchd scheduling is macOS-only)
- [Node.js](https://nodejs.org/) >= 20 and npm >= 10
- Chrome and/or [Comet](https://browser.horse/) browser

## Quick Start

```bash
git clone https://github.com/LEARNableLabs/second-brain.git
cd second-brain
./setup.sh
```

This installs dependencies, builds the extension, and creates `~/.second-brain/`. It then prompts you to load the extension in Chrome:

1. Open `chrome://extensions` and enable **Developer Mode**
2. Click **Load unpacked** → select `extension/.output/chrome-mv3`
3. Copy the extension ID, then finish setup:

```bash
./setup.sh <your-extension-id>
```

That's it. Verify with `npx second-brain --help`.

## Configuration (optional)

Configuration lives at `~/.second-brain/config.json`:

```bash
mkdir -p ~/.second-brain
```

**Output directory** — daily notes are written to `~/Documents/Obsidian/second-brain/` by default:

```json
{"outputDir": "/absolute/path/to/your/obsidian/vault"}
```

**AI provider** — defaults to `claude-code` (Claude Code CLI, no API key needed). Alternatives:

```json
{"llm": {"provider": "claude"}}
```

Requires `ANTHROPIC_API_KEY` in your environment.

```json
{"llm": {"provider": "ollama", "model": "llama3.1"}}
```

Fully local and private — requires [Ollama](https://ollama.ai/) running.

## Usage

### Browse normally

The extension captures pages automatically. It filters out noise (Gmail, Google Search, social media, banking) and requires a 5s dwell time before logging a visit. Use the popup to:
- Pause/resume capture
- Quick-block the current domain
- See capture stats

### Run the full pipeline manually

```bash
npx second-brain export                    # Pull captures from extension
npx second-brain generate                  # Create daily note
npx second-brain fetch                     # Extract full page content
npx second-brain curate                    # AI summary + topic clusters
npx second-brain curate --eod             # End-of-day polished summary
npx second-brain email                     # Send yesterday's digest via Gmail
```

All commands support `--date YYYY-MM-DD` and `--dry` flags.

### Search your captures

```bash
npx second-brain search "transformer attention"
npx second-brain search "react hooks" --from 2026-01-01 --domain dev.to
npx second-brain search "RLHF" --notes-only        # search daily notes only
npx second-brain search "arxiv" --db-only           # search captures DB only
```

### Capture Claude Code conversations

```bash
npx second-brain capture-conversation --topic "RL training loop" --summary "Discussed PPO vs GRPO..."
```

### Set up hourly automation

```bash
./pipeline/launchd/install.sh
```

This installs a launchd agent that runs the full pipeline every hour. End-of-day summary at 11 PM, morning email digest at 8 AM. Logs at `~/.second-brain/logs/second-brain.log`.

Each daily note includes:
- AI-curated highlights with topic clusters and [[wikilinks]]
- YAML frontmatter (date, capture counts, top domains, browsers)
- Browsing log grouped by domain with meta descriptions
- Source markers (star for manual saves, history suffix for backfills)

The output file is atomically written (safe while Obsidian is open) and auto-committed to a git repo in the output directory.

## Project Structure

```
second-brain/
  extension/          # Browser extension (WXT + TypeScript)
    components/       #   Storage, types, dwell tracking, blocklist
    entrypoints/      #   Background service worker, popup UI
    tests/            #   83 tests
  pipeline/           # CLI pipeline (Node.js + TypeScript)
    src/
      ai/             #   LLM provider abstraction, curation prompt, vault scanner
      commands/       #   export, generate, fetch, curate, email, capture-conversation, search
      config/         #   Config reader with Zod validation
      db/             #   SQLite connection, migrations, operations, content table
      extractors/     #   Domain-aware content extraction (arxiv, article, general)
      generators/     #   Markdown engine, frontmatter, meta fetcher, atomic writer
      git/            #   Auto-commit to output repo
      messaging/      #   Chrome Native Messaging protocol
      search/         #   Full-text search across notes and captures
    launchd/          #   macOS launchd agent for hourly automation
    tests/            #   101 tests
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
- [x] Phase 4: Content Processing (full page content fetching)
- [x] Phase 5: AI Curation (summaries, topic clustering, wikilinks)
- [x] Phase 6: Automation (hourly launchd scheduling)
- [x] Phase 7: Conversation Capture & Email Delivery
