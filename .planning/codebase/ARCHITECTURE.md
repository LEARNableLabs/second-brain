# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Personal Knowledge Management System (PKMS) with CLI-based integrations

**Key Characteristics:**
- Obsidian vault: Filesystem-based, local-first knowledge management
- Markdown content: All notes in .md format with wikilink cross-referencing
- CLI-driven workflows: Integration with Google Workspace, GSD, and research skills
- No application logic layer: Vault is content/configuration, not code

## Layers

**Presentation Layer (Obsidian UI):**
- Purpose: Display and edit markdown notes, render knowledge graph
- Location: Obsidian desktop application
- Contains: Rendered markdown, wikilink navigation, graph visualization
- Depends on: Obsidian application, .obsidian configuration
- Used by: End user for knowledge organization and retrieval

**Content Layer (Vault):**
- Purpose: Store and organize project notes and documentation
- Location: `/Users/ggiannon/Documents/gcg/second-brain/`
- Contains: Markdown files (.md), wikilinks, tags
- Depends on: Filesystem, Obsidian syntax conventions
- Used by: Presentation layer (Obsidian), external CLI tools

**Configuration Layer:**
- Purpose: Store Obsidian app settings and vault metadata
- Location: `.obsidian/` directory
- Contains: `workspace.json`, `app.json`, `core-plugins.json`, `graph.json`, `appearance.json`
- Depends on: Obsidian application
- Used by: Obsidian runtime for UI customization and plugin management

**Integration Layer (CLI Tools):**
- Purpose: Enable external service access (Google Workspace, GSD tasks, research skills)
- Location: Global npm packages and system keyring
- Contains: `gws`, GSD (v1.34.2), Claude Scientific Skills, Orchestra AI Research Skills
- Depends on: System keyring for OAuth tokens, GCP credentials
- Used by: Development workflows, task automation, research operations

## Data Flow

**Note Creation and Management:**

1. User creates/edits `.md` file in Obsidian
2. Content stored directly to filesystem at `/Users/ggiannon/Documents/gcg/second-brain/`
3. Obsidian parses markdown and wikilinks, updates internal index
4. Knowledge graph updates (stored in `.obsidian/graph.json`)
5. File available for CLI tools to read/reference

**Google Workspace Integration:**

1. User invokes `gws <service> <resource> <method>` via CLI
2. gws CLI reads OAuth credentials from system keyring
3. GCP APIs authenticate and execute request
4. Results returned to CLI as JSON (or other format via --format flag)
5. User can save to vault or integrate with notes

**Task and Workflow Automation:**

1. User invokes GSD commands (`npx get-shit-done-cc@latest`)
2. GSD hooks monitor development workflow (commits, reads, edits)
3. Skills execute based on hook triggers (AI Research Skills, Scientific Skills)
4. Results can be written to vault or stdout

**State Management:**

- Obsidian workspace state: `.obsidian/workspace.json` (active file, sidebar state, etc.)
- Vault state: Filesystem timestamps and file content
- App settings: `.obsidian/app.json`, `.obsidian/appearance.json`
- Plugin state: `.obsidian/core-plugins.json` (which plugins are active)
- Graph state: `.obsidian/graph.json` (node positions, link visualization)

## Key Abstractions

**Vault:**
- Purpose: Container for all notes and configuration
- Examples: `/Users/ggiannon/Documents/gcg/second-brain/`
- Pattern: Local filesystem directory following Obsidian conventions

**Wikilink:**
- Purpose: Create semantic connections between notes
- Examples: `[[Resources]]`, `[[project-name]]`
- Pattern: Markdown syntax `[[reference]]` parsed by Obsidian

**Note:**
- Purpose: Individual knowledge unit
- Examples: `Resources.md`
- Pattern: Markdown file with optional YAML frontmatter

**Tag:**
- Purpose: Categorize and filter notes
- Examples: `#project`, `#research`, `#task`
- Pattern: Markdown hash syntax `#tagname`

**CLI Tool:**
- Purpose: Extend vault capabilities with external services
- Examples: `gws` (Google Workspace), GSD (task automation)
- Pattern: NPM-installed global executables with command-line interface

## Entry Points

**Obsidian Application:**
- Location: Desktop app launch
- Triggers: User opens Obsidian or switches focus to window
- Responsibilities: Render UI, parse markdown, manage editing, sync vault state

**CLI Commands:**
- Location: Terminal invocations
- Triggers: User types `gws`, `npx get-shit-done-cc@latest`, etc.
- Responsibilities: Authenticate, execute remote operations, return results

**Vault Files:**
- Location: `*.md` files in `/Users/ggiannon/Documents/gcg/second-brain/`
- Triggers: Obsidian indexes files on startup and watches for changes
- Responsibilities: Store content, maintain wikilink structure

## Error Handling

**Strategy:** Passive observation with limited error recovery in vault layer

**Patterns:**

- **Obsidian errors:** Displayed in app UI, logged to Obsidian console
- **CLI errors:** Returned to terminal via exit codes and stderr
- **Sync errors:** Obsidian reports sync failures in notifications (if Obsidian Sync is enabled)
- **Google Workspace auth failures:** `gws auth login` re-authenticates via browser OAuth flow
- **Filesystem errors:** Obsidian detects missing/moved files and updates vault state

## Cross-Cutting Concerns

**Linking & Navigation:**
- Wikilinks enable semantic navigation between notes
- Obsidian graph visualizes relationship network
- Backlinks automatically computed from forward links

**Metadata & Discovery:**
- Tags provide free-form categorization
- Obsidian search indexes all note content
- Graph-based browsing shows relationship structure

**Authentication:**
- Google Workspace: OAuth 2.0 via system keyring
- GSD/Skills: Local npm installation (no auth needed)
- Obsidian Sync: Optional native feature (if enabled)

**Data Persistence:**
- Primary: Filesystem (`.md` files)
- State: JSON configuration files in `.obsidian/`
- Credentials: System keyring (secure storage)

---

*Architecture analysis: 2026-04-09*
