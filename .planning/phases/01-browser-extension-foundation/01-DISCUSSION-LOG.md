# Phase 1: Browser Extension Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-09
**Phase:** 1-browser-extension-foundation
**Areas discussed:** Extension popup UI, Capture behavior, Blocklist defaults, History fallback

---

## Extension popup UI

| Option | Description | Selected |
|--------|-------------|----------|
| Status dashboard | Shows capture status (on/off), count of pages captured today, quick toggle | ✓ |
| Recent captures | Shows last 5-10 captured pages with titles and timestamps | |
| Minimal indicator | Just an icon badge with count, minimal/no popup | |
| You decide | Claude picks | |

**User's choice:** Status dashboard
**Notes:** User wants to see capture status at a glance without clutter

---

| Option | Description | Selected |
|--------|-------------|----------|
| Pause (temporary) | Toggle pauses capture until toggled back on or browser restart | ✓ |
| Full disable | Completely stops all extension activity | |
| You decide | Claude picks | |

**User's choice:** Pause (temporary)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, quick block button | One click adds current domain to blocklist | ✓ |
| No, blocklist only | Blocklist management in separate view | |
| You decide | Claude picks | |

**User's choice:** Yes, quick block button
**Notes:** None

---

## Capture behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Every page load | Capture on every completed navigation | |
| Dwell threshold | Only capture if user stays on page for threshold duration | ✓ |
| Tab focus + load | Capture on load only when tab is focused | |
| You decide | Claude picks | |

**User's choice:** Dwell threshold
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3 seconds | Quick threshold, captures most intentional visits | |
| 5 seconds | Moderate threshold, filters quick scans | ✓ |
| 10 seconds | Conservative, only pages actively read | |
| You decide | Claude picks | |

**User's choice:** 5 seconds
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, capture all loads | Background tabs captured immediately, no dwell needed | |
| No, dwell for all | Every tab must meet 5-second dwell threshold | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide
**Notes:** Deferred to Claude's discretion for background tab handling

---

| Option | Description | Selected |
|--------|-------------|----------|
| Deduplicate per day | Each URL captured once per day | ✓ |
| Log every visit | Every visit gets its own timestamp entry | |
| You decide | Claude picks | |

**User's choice:** Deduplicate per day
**Notes:** None

---

## Blocklist defaults

| Option | Description | Selected |
|--------|-------------|----------|
| Domain + subdomains | Block domain and all subdomains automatically | ✓ |
| Exact domain only | Must list each subdomain individually | |
| Regex patterns | Full regex support for pattern matching | |
| You decide | Claude picks | |

**User's choice:** Domain + subdomains
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Google services | Gmail, Search, Docs, Drive, Calendar, Maps | ✓ |
| Banking & finance | Banks, PayPal, Venmo, etc. | ✓ |
| Social media | Twitter/X, Reddit, Facebook, Instagram, LinkedIn, YouTube | ✓ |
| Auth & internal | SSO, login portals, localhost, chrome:// pages | ✓ |

**User's choice:** All four categories
**Notes:** Comprehensive default blocklist — capture everything except known noise

---

| Option | Description | Selected |
|--------|-------------|----------|
| JSON config file | blocklist.json file users edit directly | ✓ |
| Extension options page | Full settings page with add/remove UI | |
| Both (file + UI) | JSON as source of truth + GUI editor | |
| You decide | Claude picks | |

**User's choice:** JSON config file
**Notes:** Aligns with text-file-first philosophy of the Obsidian vault

---

## History fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Auto on startup | Extension checks for gaps and silently backfills | ✓ |
| Manual CLI command | User runs backfill command for date range | |
| Both (auto + manual) | Auto for recent, CLI for arbitrary ranges | |
| You decide | Claude picks | |

**User's choice:** Auto on startup
**Notes:** Fully automatic, no user action required

---

| Option | Description | Selected |
|--------|-------------|----------|
| 24 hours | Only backfill last day | |
| 7 days | Cover vacations and browser updates | |
| Since last capture | Dynamic, could be hours or weeks | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide
**Notes:** Deferred to Claude's discretion on lookback window

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, mark them | Backfilled entries get subtle visual indicator | ✓ |
| No, treat equally | All entries look the same | |
| You decide | Claude picks | |

**User's choice:** Yes, mark them
**Notes:** User wants to distinguish live captures from reconstructed history

---

## Claude's Discretion

- Background tab handling when opening multiple tabs at once
- History backfill lookback window duration

## Deferred Ideas

None — discussion stayed within phase scope
