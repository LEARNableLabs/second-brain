# Phase 3: Daily Note Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-10
**Phase:** 03-daily-note-generation
**Areas discussed:** Note layout & structure, Timeline entry format, Incremental update strategy, Git auto-commit behavior

---

## Note Layout & Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Include timestamps | Each entry shows when you visited it | |
| Store but don't display | Timestamps in DB only, clean note display | |
| You decide | Claude picks based on readability | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** User questioned why timestamps matter at all — the core value is *what* you looked at, not *when*. Timestamps are already in the database for Phase 5 AI use regardless.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Summary + Browsing Log | Highlights placeholder top, browsing log bottom | ✓ (hybrid) |
| Browsing log only | Just URL list, no sections | |
| Grouped by domain | URLs organized by site | ✓ (combined) |

**User's choice:** Summary + Browsing Log + Grouped by domain (hybrid of options 1 and 3)
**Notes:** User wanted both the section structure AND domain grouping. Result: Highlights placeholder at top, Browsing Log with `### domain.com` subheadings below.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Minimal (date + count) | Just `date` and `captures` count | |
| Richer metadata | date, captures, manual, top domains, sources | ✓ |
| You decide | Claude picks | |

**User's choice:** Richer metadata
**Notes:** Enables Obsidian Dataview queries from day one.

---

## Timeline Entry Format

| Option | Description | Selected |
|--------|-------------|----------|
| Title as link | Single-line clickable link | |
| Title + description line | Two-line: title link + indented description | ✓ |
| You decide | Claude picks | |

**User's choice:** Title + description line
**Notes:** User also wanted the URL shown visibly (not just as a hidden markdown link target).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show domain only for now | Domain as placeholder description | |
| Skip description until Phase 4 | No description line yet | |
| Lightweight meta fetch | HTTP request for `<meta description>` | ✓ |

**User's choice:** Lightweight meta fetch
**Notes:** Provides real descriptions from day one, before Phase 4 content processing is built.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Subtle markers | Star for manual, "(from history)" for backfill | ✓ |
| Separate sections | Manual saves in own section | |
| No distinction | All entries look the same | |

**User's choice:** Subtle markers
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline after title | URL shown after markdown link with em dash | ✓ |
| On description line | URL on second line with description | |
| You decide | Claude picks | |

**User's choice:** Inline after title
**Notes:** User explicitly asked to "show the link too" — wants URL visible, not hidden in markdown link syntax.

---

## Incremental Update Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Regenerate from DB | Rebuild entire note each cycle | |
| True append | Only add new entries to existing file | |
| You decide | Claude picks strategy | ✓ |

**User's choice:** You decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Temp file + rename | Atomic write via rename | ✓ |
| Direct overwrite | Write directly to file | |
| You decide | Claude picks | |

**User's choice:** Temp file + rename
**Notes:** Standard safe-write pattern for Obsidian compatibility.

---

## Git Auto-Commit Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Every generate cycle | Commit after each run | |
| End of day only | Commit final version | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Output folder is its own git repo | Separate repo for notes | ✓ |
| Use existing vault git repo | Commit into vault's repo | |
| You decide | Claude picks | |

**User's choice:** Output folder is its own git repo
**Notes:** Keeps note version history independent from second-brain project code.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Date-based | `daily: 2026-04-10` | |
| Stats-based | `2026-04-10: 23 captures (5 new)` | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide
**Notes:** None

---

## Claude's Discretion

- Timestamp display in notes
- Incremental update strategy (regenerate vs append)
- Git commit timing and message format
- Meta description fetch timeout/fallback
- Domain grouping order
- Handling of failed meta description fetches

## Deferred Ideas

- History import feature — import browser history to bootstrap database (user idea)
- Claude Code skill for AI conversation capture (already Phase 7 scope)
