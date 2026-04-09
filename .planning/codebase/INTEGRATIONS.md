# External Integrations

**Analysis Date:** 2026-04-09

## Google Workspace Integration

**Google Workspace CLI (`gws`):**
- Service: Multi-service Google integration
- What it's used for: Interact with Gmail, Drive, Calendar, Sheets, Docs, Slides, Tasks
- SDK/Client: `@googleworkspace/cli`
- Auth: OAuth 2.0 (Desktop app type)
- Configuration: GCP Project with API enablement (Gmail, Drive, Calendar, Sheets, Docs, Slides, Tasks)
- Credentials: Client ID and Client Secret stored in system keyring
- Usage: Command-line interface with pattern `gws <service> <resource> [sub-resource] <method> [flags]`

## CLI Tool Integrations

**Get Shit Done (GSD):**
- Service: Development workflow automation
- What it's used for: Spec-driven development, task orchestration
- Installation: `npx get-shit-done-cc@latest` (v1.34.2)
- Scope: 68 skills, hooks, and agents
- Hook integrations:
  - Update check
  - Context window monitor
  - Prompt injection guard
  - Read-before-edit guard
  - Workflow guard
  - Commit validation
  - Session state orientation
  - Phase boundary detection

**Claude Scientific Skills:**
- Service: Scientific computing and data analysis
- What it's used for: Scientific workflows and research tasks
- Installation: `npx skills add K-Dense-AI/claude-scientific-skills`
- Skill location: `.agents/skills/`
- Dependency: Git LFS (`git-lfs` via `brew install git-lfs`)

**AI Research Skills (Orchestra):**
- Service: AI research engineering
- What it's used for: 82 skills across 20 categories for AI research workflows
- Installation: `npx @orchestra-research/ai-research-skills` (v1.5.1)
- Global installation: `~/.claude/skills/`

## Environment Configuration

**Required env vars:**
- None explicitly detected in vault configuration
- Google Workspace: Credentials managed via system keyring (no .env file needed)

**Secrets location:**
- System keyring: `gws` credentials (OAuth tokens)
- GCP project: Client ID and Client Secret (provided at `gws auth login`)

## Obsidian Integrations

**Knowledge Graph:**
- Built-in Obsidian feature for visualizing note relationships
- Configuration: `.obsidian/graph.json`

**Wikilink Resolution:**
- Internal linking via `[[reference]]` syntax
- Obsidian maintains link index and backlinks

## Data Storage

**Local Storage:**
- Filesystem at `/Users/ggiannon/Documents/gcg/second-brain/`
- No remote sync configured (native Obsidian Sync not explicitly enabled)

**No external databases detected:**
- Vault is entirely filesystem-based
- No mentions of Supabase, Firebase, MongoDB, or similar

## No Direct API Integrations in Vault

**Outgoing:**
- No webhooks or callbacks defined in vault structure
- Integrations are CLI-based rather than webhook-based

**Incoming:**
- None detected

## Dependency Management

**NPM Global Packages:**
- `@googleworkspace/cli`
- `get-shit-done-cc@latest` (v1.34.2)
- `@orchestra-research/ai-research-skills` (v1.5.1)

**Homebrew Dependencies:**
- `git-lfs` (required for Claude Scientific Skills)

---

*Integration audit: 2026-04-09*
