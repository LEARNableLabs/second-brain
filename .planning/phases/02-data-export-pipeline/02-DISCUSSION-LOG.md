# Phase 2: Data Export Pipeline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 02-data-export-pipeline
**Areas discussed:** Data bridge mechanism, Manual capture integration, CLI & invocation design, Project structure

---

## Data Bridge Mechanism

| Option | Description | Selected |
|--------|-------------|----------|
| Native Messaging Host | Chrome-blessed API. Extension sends data to a registered local process via stdin/stdout. Most reliable, bidirectional, works with both Chrome and Comet. | ✓ |
| Export-to-file | Extension dumps captures as JSON to a known path. CLI reads and imports. Simple but requires chrome.alarms for MV3 wake. | |
| Direct LevelDB read | CLI reads Chrome's internal LevelDB files directly from disk. Zero extension changes but brittle. | |

**User's choice:** Native Messaging Host
**Notes:** None — clear preference for the Chrome-blessed approach.

| Option | Description | Selected |
|--------|-------------|----------|
| CLI pulls on demand | User runs CLI command, it requests data from extension via native messaging. | ✓ |
| Extension pushes periodically | Extension uses chrome.alarms to push data automatically. | |
| Both — push + pull | Maximum reliability but most complex. | |

**User's choice:** CLI pulls on demand
**Notes:** Phase 6 automation will trigger this hourly via launchd.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep 7 days, then clear | Extension retains captures for 7 days as safety buffer. | ✓ |
| Clear immediately after export | Delete right after successful export. No safety net. | |
| Never clear | Accumulate indefinitely. Would hit chrome.storage 10MB limit. | |

**User's choice:** Keep 7 days, then clear

---

## Manual Capture Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Popup button | Add "Save this page" button to existing extension popup. | ✓ |
| Keyboard shortcut | Global browser shortcut (e.g., Ctrl+Shift+S). | |
| Context menu (right-click) | Right-click menu item. | |
| Popup + shortcut combo | Both popup button and keyboard shortcut. | |

**User's choice:** Popup button
**Notes:** Keeps UI in one place, minimal extension changes.

| Option | Description | Selected |
|--------|-------------|----------|
| New source value: 'manual' | Extend existing source enum. Clean, reuses existing field. | ✓ |
| Separate 'pinned' boolean | New field alongside source. More expressive but adds complexity. | |
| Priority tier system | Multiple importance levels. Over-engineered for v1. | |

**User's choice:** New source value: 'manual'

| Option | Description | Selected |
|--------|-------------|----------|
| Upgrade existing to 'manual' | Change 'live' entry's source to 'manual'. One entry per URL maintained. | ✓ |
| Add second entry | Keep 'live' and add 'manual'. Two entries for same URL. | |
| Keep original, add pinned flag | Hybrid — preserve source, add flag. Needs extra field anyway. | |

**User's choice:** Upgrade existing entry to 'manual'

| Option | Description | Selected |
|--------|-------------|----------|
| Fold into Phase 2 first plan | Extension changes + pipeline ship together. | |
| Insert as Phase 1.1 | Separate small phase before Phase 2. Own tests and verification. | ✓ |
| Defer to later | Risk: SQLite schema might not account for it. | |

**User's choice:** Insert as Phase 1.1
**Notes:** User prefers clean separation — extension changes verified independently before building export pipeline on top.

---

## CLI & Invocation Design

| Option | Description | Selected |
|--------|-------------|----------|
| second-brain export | Dedicated CLI with subcommands. Clear namespace, expandable. | ✓ |
| sb export | Shorter alias. Might conflict with other tools. | |
| npx second-brain export | No global install. More to type. | |

**User's choice:** second-brain export

| Option | Description | Selected |
|--------|-------------|----------|
| Summary stats | Concise summary: counts, manual saves, source, DB path. | ✓ |
| Verbose per-URL log | Print each URL as exported. Noisy for daily use. | |
| Silent (exit code only) | No output on success. Unix philosophy. | |

**User's choice:** Summary stats

| Option | Description | Selected |
|--------|-------------|----------|
| ~/.second-brain/data.db | Dedicated dot-directory in home. Standard macOS convention. | ✓ |
| Inside the vault | Store alongside notes. Risk of Obsidian confusion and git bloat. | |
| XDG-style paths | Most macOS-native but splits files across locations. | |

**User's choice:** ~/.second-brain/data.db

---

## Project Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Monorepo with shared types | extension/, pipeline/, shared/ as siblings. Type safety across boundary. | ✓ |
| Pipeline inside extension/ | Everything under extension/. Mixes browser and Node.js code. | |
| Flat — no shared directory | Duplicate types between packages. Types may drift. | |

**User's choice:** Monorepo with shared types

| Option | Description | Selected |
|--------|-------------|----------|
| npm workspaces | Root package.json with workspaces config. No extra tooling. | ✓ |
| Independent packages | No workspace manager. Manual import management. | |
| pnpm workspaces | Faster but adds tool dependency. | |

**User's choice:** npm workspaces

---

## Claude's Discretion

- SQLite table structure and column types
- Schema versioning mechanism
- Native messaging host manifest and registration
- Error handling strategy for export failures
- CLI framework choice

## Deferred Ideas

- Phase 1.1: Manual capture — extension UI button + source enum update (must complete before Phase 2)
