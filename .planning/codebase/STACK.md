# Technology Stack

**Analysis Date:** 2026-04-09

## Format & Specification

**Primary Format:**
- Markdown (.md) - Obsidian-native format for all note content

**Obsidian Syntax:**
- Wikilinks: `[[reference]]` format for internal cross-linking
- Tags: `#tag` format for categorization and indexing
- Callouts (blockquote-based formatting)
- YAML frontmatter (optional for metadata)

## Editor & Platform

**Knowledge Management System:**
- Obsidian (version unspecified in vault)
- Desktop application for note management
- Local-first vault storage (filesystem-based)
- Configuration: `.obsidian/` directory (core-plugins.json, app.json, appearance.json, graph.json, workspace.json)

## Related CLI Tools (Integrated via CLAUDE.md)

**Google Workspace CLI (`gws`):**
- Package: `@googleworkspace/cli`
- Installation: `npm install -g @googleworkspace/cli`
- Purpose: Interact with Google services (Drive, Sheets, Gmail, Calendar, Docs, Slides, Tasks)
- Auth method: OAuth 2.0 via GCP credentials
- Token storage: System keyring (no manual token handling)

**Get Shit Done (GSD):**
- Version: 1.34.2
- Installation: `npx get-shit-done-cc@latest`
- Skills: 68 skills, hooks, and agents for spec-driven development
- Skill location: `~/.claude/skills/`
- Core hooks: update check, context window monitor, prompt injection guard, read-before-edit guard, workflow guard, commit validation, session state orientation, phase boundary detection

**Claude Scientific Skills:**
- Installation: `npx skills add K-Dense-AI/claude-scientific-skills`
- Skill location: `.agents/skills/`
- Purpose: Scientific computing and data analysis
- Dependency: `git-lfs` (via `brew install git-lfs`)

**AI Research Skills (Orchestra):**
- Version: 1.5.1
- Installation: `npx @orchestra-research/ai-research-skills`
- Skill location: `~/.claude/skills/`
- Scope: 82 skills across 20 categories for AI research engineering

## Configuration Files

**Vault Configuration:**
- `.obsidian/workspace.json` - Active workspace state
- `.obsidian/app.json` - Application settings
- `.obsidian/core-plugins.json` - Enabled Obsidian core plugins
- `.obsidian/graph.json` - Knowledge graph visualization settings
- `.obsidian/appearance.json` - Visual theme and UI settings

## No Build System

**Development:**
- No bundler detected
- No transpiler configuration
- No package.json in vault root (dependencies managed globally via npm/npx)

**Runtime:**
- Browser: Obsidian renders Markdown locally
- No Node.js application code

## Storage & Persistence

**Local Storage:**
- Filesystem-based vault at `/Users/ggiannon/Documents/gcg/second-brain/`
- Markdown files committed to version control (no .gitignore detected)

**Remote Integrations:**
- Google Workspace services (via `gws` CLI)
- Obsidian Sync (if enabled - not visible in config)

## Language & Scripting

**Content:**
- Markdown (all notes)

**Configuration:**
- JSON (Obsidian config files)
- YAML (potential frontmatter in notes)

---

*Stack analysis: 2026-04-09*
