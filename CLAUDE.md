<!-- GSD:project-start source:PROJECT.md -->
## Project

**Second Brain**

An automated knowledge capture system that passively logs everything you browse during the day, then uses AI to curate a daily highlights page in your Obsidian vault. It turns forgotten tabs and half-read papers into an organized, actionable reading list — so your browsing history becomes your external memory.

**Core Value:** Every page you visit is captured and intelligently surfaced — you never lose track of what caught your attention.

### Constraints

- **Platform**: macOS only — cron/launchd for scheduling
- **Browsers**: Must support Chrome and Comet browser
- **Storage**: Metadata + AI summaries only — full content fetched for processing but not stored
- **Privacy**: LLM provider must be swappable so user can run locally if desired
- **Vault format**: All output must be valid Obsidian Markdown with [[wikilinks]]
- **Non-intrusive**: Fully passive capture — no user action required during browsing
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Format & Specification
- Markdown (.md) - Obsidian-native format for all note content
- Wikilinks: `[[reference]]` format for internal cross-linking
- Tags: `#tag` format for categorization and indexing
- Callouts (blockquote-based formatting)
- YAML frontmatter (optional for metadata)
## Editor & Platform
- Obsidian (version unspecified in vault)
- Desktop application for note management
- Local-first vault storage (filesystem-based)
- Configuration: `.obsidian/` directory (core-plugins.json, app.json, appearance.json, graph.json, workspace.json)
## Related CLI Tools (Integrated via CLAUDE.md)
- Package: `@googleworkspace/cli`
- Installation: `npm install -g @googleworkspace/cli`
- Purpose: Interact with Google services (Drive, Sheets, Gmail, Calendar, Docs, Slides, Tasks)
- Auth method: OAuth 2.0 via GCP credentials
- Token storage: System keyring (no manual token handling)
- Version: 1.34.2
- Installation: `npx get-shit-done-cc@latest`
- Skills: 68 skills, hooks, and agents for spec-driven development
- Skill location: `~/.claude/skills/`
- Core hooks: update check, context window monitor, prompt injection guard, read-before-edit guard, workflow guard, commit validation, session state orientation, phase boundary detection
- Installation: `npx skills add K-Dense-AI/claude-scientific-skills`
- Skill location: `.agents/skills/`
- Purpose: Scientific computing and data analysis
- Dependency: `git-lfs` (via `brew install git-lfs`)
- Version: 1.5.1
- Installation: `npx @orchestra-research/ai-research-skills`
- Skill location: `~/.claude/skills/`
- Scope: 82 skills across 20 categories for AI research engineering
## Configuration Files
- `.obsidian/workspace.json` - Active workspace state
- `.obsidian/app.json` - Application settings
- `.obsidian/core-plugins.json` - Enabled Obsidian core plugins
- `.obsidian/graph.json` - Knowledge graph visualization settings
- `.obsidian/appearance.json` - Visual theme and UI settings
## No Build System
- No bundler detected
- No transpiler configuration
- No package.json in vault root (dependencies managed globally via npm/npx)
- Browser: Obsidian renders Markdown locally
- No Node.js application code
## Storage & Persistence
- Filesystem-based vault at `/Users/ggiannon/Documents/gcg/second-brain/`
- Markdown files committed to version control (no .gitignore detected)
- Google Workspace services (via `gws` CLI)
- Obsidian Sync (if enabled - not visible in config)
## Language & Scripting
- Markdown (all notes)
- JSON (Obsidian config files)
- YAML (potential frontmatter in notes)
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- Obsidian vault: Filesystem-based, local-first knowledge management
- Markdown content: All notes in .md format with wikilink cross-referencing
- CLI-driven workflows: Integration with Google Workspace, GSD, and research skills
- No application logic layer: Vault is content/configuration, not code
## Layers
- Purpose: Display and edit markdown notes, render knowledge graph
- Location: Obsidian desktop application
- Contains: Rendered markdown, wikilink navigation, graph visualization
- Depends on: Obsidian application, .obsidian configuration
- Used by: End user for knowledge organization and retrieval
- Purpose: Store and organize project notes and documentation
- Location: `/Users/ggiannon/Documents/gcg/second-brain/`
- Contains: Markdown files (.md), wikilinks, tags
- Depends on: Filesystem, Obsidian syntax conventions
- Used by: Presentation layer (Obsidian), external CLI tools
- Purpose: Store Obsidian app settings and vault metadata
- Location: `.obsidian/` directory
- Contains: `workspace.json`, `app.json`, `core-plugins.json`, `graph.json`, `appearance.json`
- Depends on: Obsidian application
- Used by: Obsidian runtime for UI customization and plugin management
- Purpose: Enable external service access (Google Workspace, GSD tasks, research skills)
- Location: Global npm packages and system keyring
- Contains: `gws`, GSD (v1.34.2), Claude Scientific Skills, Orchestra AI Research Skills
- Depends on: System keyring for OAuth tokens, GCP credentials
- Used by: Development workflows, task automation, research operations
## Data Flow
- Obsidian workspace state: `.obsidian/workspace.json` (active file, sidebar state, etc.)
- Vault state: Filesystem timestamps and file content
- App settings: `.obsidian/app.json`, `.obsidian/appearance.json`
- Plugin state: `.obsidian/core-plugins.json` (which plugins are active)
- Graph state: `.obsidian/graph.json` (node positions, link visualization)
## Key Abstractions
- Purpose: Container for all notes and configuration
- Examples: `/Users/ggiannon/Documents/gcg/second-brain/`
- Pattern: Local filesystem directory following Obsidian conventions
- Purpose: Create semantic connections between notes
- Examples: `[[Resources]]`, `[[project-name]]`
- Pattern: Markdown syntax `[[reference]]` parsed by Obsidian
- Purpose: Individual knowledge unit
- Examples: `Resources.md`
- Pattern: Markdown file with optional YAML frontmatter
- Purpose: Categorize and filter notes
- Examples: `#project`, `#research`, `#task`
- Pattern: Markdown hash syntax `#tagname`
- Purpose: Extend vault capabilities with external services
- Examples: `gws` (Google Workspace), GSD (task automation)
- Pattern: NPM-installed global executables with command-line interface
## Entry Points
- Location: Desktop app launch
- Triggers: User opens Obsidian or switches focus to window
- Responsibilities: Render UI, parse markdown, manage editing, sync vault state
- Location: Terminal invocations
- Triggers: User types `gws`, `npx get-shit-done-cc@latest`, etc.
- Responsibilities: Authenticate, execute remote operations, return results
- Location: `*.md` files in `/Users/ggiannon/Documents/gcg/second-brain/`
- Triggers: Obsidian indexes files on startup and watches for changes
- Responsibilities: Store content, maintain wikilink structure
## Error Handling
- **Obsidian errors:** Displayed in app UI, logged to Obsidian console
- **CLI errors:** Returned to terminal via exit codes and stderr
- **Sync errors:** Obsidian reports sync failures in notifications (if Obsidian Sync is enabled)
- **Google Workspace auth failures:** `gws auth login` re-authenticates via browser OAuth flow
- **Filesystem errors:** Obsidian detects missing/moved files and updates vault state
## Cross-Cutting Concerns
- Wikilinks enable semantic navigation between notes
- Obsidian graph visualizes relationship network
- Backlinks automatically computed from forward links
- Tags provide free-form categorization
- Obsidian search indexes all note content
- Graph-based browsing shows relationship structure
- Google Workspace: OAuth 2.0 via system keyring
- GSD/Skills: Local npm installation (no auth needed)
- Obsidian Sync: Optional native feature (if enabled)
- Primary: Filesystem (`.md` files)
- State: JSON configuration files in `.obsidian/`
- Credentials: System keyring (secure storage)
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.

### Speed Over Ceremony

This is a small, single-developer project. Match process weight to task complexity:
- **Simple/well-scoped changes** (< ~5 files, clear requirements): Use `/gsd-quick` or just implement directly. Skip discuss/research/plan phases.
- **Medium changes** (new feature touching multiple modules): Plan briefly, then execute. Skip research agents.
- **Complex/ambiguous changes** (new architecture, multiple unknowns): Use the full discuss → plan → execute cycle.

When in doubt, bias toward speed. The user can always ask for more rigor if needed.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
