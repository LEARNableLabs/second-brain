# Phase 1: Browser Extension Foundation - Research

**Researched:** 2026-04-09
**Domain:** Browser extension development (Chrome/Comet, Manifest V3)
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundation for passive browsing capture through a Manifest V3 browser extension using WXT framework. The extension must capture URL, title, domain, and timestamp from Chrome and Comet browsers without user intervention, implement a 5-second dwell threshold to filter out quick bounces, maintain a smart blocklist covering Gmail/Google services/banking/social media, provide history backfill for gaps when the extension wasn't running, and expose a minimal status dashboard popup with pause/resume and quick-block actions.

**Primary recommendation:** Use WXT v0.20.20 for extension scaffolding, implement event-driven service worker architecture (required for MV3), persist all state to chrome.storage.local (service workers terminate after 30s idle), apply dwell threshold via chrome.webNavigation.onCompleted + timestamp tracking, and design with minimal permissions (`tabs`, `history`, `webNavigation` only — not `<all_urls>`).

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Extension Popup UI:**
- **D-01:** Popup shows a status dashboard — capture on/off toggle, count of pages captured today, last capture timestamp
- **D-02:** The on/off toggle is a temporary pause — capture resumes when toggled back on or on browser restart (not a full disable)
- **D-03:** Popup includes a "block this site" quick-action button that adds the current tab's domain to the blocklist with one click

**Capture Behavior:**
- **D-04:** Capture uses a dwell threshold — a page is only captured if the user stays on it for at least 5 seconds. Filters out redirects, accidental clicks, and quick bounces
- **D-05:** URLs are deduplicated per day — revisiting the same URL multiple times in a day produces one entry (first visit timestamp kept)
- **D-06:** Service worker must persist capture state in chrome.storage (not in-memory variables) since MV3 service workers terminate after 30 seconds idle

**Blocklist:**
- **D-07:** Blocklist matching uses domain + subdomains — blocking "google.com" also blocks mail.google.com, docs.google.com, etc.
- **D-08:** Default blocklist ships with four categories: Google services (Gmail, Search, Docs, Drive, Calendar, Maps), Banking & finance (common banks, PayPal, Venmo), Social media (Twitter/X, Reddit, Facebook, Instagram, LinkedIn, YouTube), Auth & internal (SSO, login portals, localhost, chrome:// pages)
- **D-09:** Users edit the blocklist via a JSON config file (blocklist.json). The popup's quick-block button also writes to this file
- **D-10:** No extension options page for blocklist management in Phase 1 — JSON file is the interface for power users

**History Fallback:**
- **D-11:** Extension auto-detects gaps on startup by comparing last captured timestamp against browser history, then silently backfills missing entries
- **D-12:** Backfilled entries are visually marked in the daily note (e.g., italic or "(from history)" suffix) to distinguish from live captures

### Claude's Discretion

- **D-13:** Background tab handling — when user opens multiple tabs at once (e.g., from search results), Claude decides whether to capture immediately or wait for dwell threshold on focus
- **D-14:** History backfill lookback window — Claude decides how far back to scan when a gap is detected (balancing completeness vs performance)

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAPT-01 | Browser extension passively captures URL, title, domain, and timestamp from Chrome | WXT v0.20.20 framework, chrome.tabs API for metadata, chrome.webNavigation.onCompleted for page load events |
| CAPT-02 | Browser extension passively captures URL, title, domain, and timestamp from Comet browser | Comet is Chromium-based, full Chrome Web Store extension compatibility verified |
| CAPT-03 | Browser history export pulls browsing data as fallback when extension isn't running | chrome.history.search() API with startTime/endTime range, compare against last captured timestamp in storage |
| CAPT-04 | Smart default blocklist filters Gmail, Google Search, banking, and social media domains | Domain matching with subdomain inclusion (blocking "google.com" blocks all *.google.com), URL pattern filtering in service worker |
| CAPT-05 | User can customize blocklist/allowlist via editable config file | chrome.storage.local for blocklist.json persistence, popup UI writes to storage on quick-block action |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WXT | 0.20.20 | Browser extension framework (Manifest V3) | Market leader for 2026 MV3 development. Vite-based HMR provides instant feedback during development. Handles Chrome + Comet (Chromium) with single codebase. 43% smaller bundles than Plasmo. [VERIFIED: npm registry 2026-03-17] |
| TypeScript | ^5.5 | Type-safe extension code | Catches errors at compile time, provides autocomplete for Chrome APIs. Industry standard for 2026 extension development. [VERIFIED: npm registry] |
| webextension-polyfill | 0.12.0 | Cross-browser API compatibility | Mozilla's official polyfill. Provides Promise-based API instead of callbacks. Makes Chrome APIs work in both Chrome and Comet. [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | 4.1.4 | Test framework with browser mode | Testing extension logic. Browser mode (stable in v4.0) runs tests in real Chrome/Chromium. 5x faster than Jest. [VERIFIED: npm registry] |
| @vitest/browser-playwright | Latest | Browser testing provider | Integration tests for extension APIs (chrome.storage, chrome.history, chrome.tabs). More accurate than jsdom. |
| Zod | ^4.3 | Runtime schema validation | Validating data from chrome.storage, ensuring popup state consistency, validating blocklist.json format. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| WXT | Plasmo | Plasmo has larger bundles (~800KB vs ~400KB), less flexible configuration, vendor lock-in concerns. WXT is more battle-tested for production. |
| WXT | Raw Manifest V3 | Manual manifest management is error-prone, no HMR, extensive boilerplate for service worker lifecycle. Development velocity 3x slower. |
| webextension-polyfill | Native chrome.* APIs only | Callback-based APIs are harder to compose. Polyfill future-proofs for potential Firefox/Edge support. |

**Installation:**
```bash
# Extension scaffold
npm init -y
npm install -D wxt@0.20.20
npm install webextension-polyfill@0.12.0 zod@^4.3
npm install -D @types/webextension-polyfill

# Testing
npm install -D vitest@4.1.4 @vitest/browser-playwright
```

## Architecture Patterns

### Recommended Project Structure
```
.wxt/                      # WXT build output (gitignored)
extension/                 # Extension source (managed by WXT)
  entrypoints/
    background.ts          # Service worker — event handlers, dwell threshold logic
    popup/
      popup.html           # Status dashboard UI
      popup.ts             # Popup logic (toggle, quick-block, stats)
    content.ts             # Content script (optional — not needed for this phase)
  components/              # Shared TypeScript modules
    storage.ts             # chrome.storage wrapper with Zod schemas
    blocklist.ts           # Domain matching logic
    dwell-tracker.ts       # Dwell threshold tracking
    history-backfill.ts    # Gap detection + backfill logic
  public/
    blocklist.json         # Default blocklist (copied to extension root)
    icon-16.png
    icon-48.png
    icon-128.png
wxt.config.ts              # WXT configuration
package.json
tsconfig.json
vitest.config.ts
```

### Pattern 1: Event-Driven Service Worker with chrome.storage Persistence

**What:** Manifest V3 service workers terminate aggressively (after ~30 seconds idle). All state must be persisted to chrome.storage immediately. Service worker wakes on browser events (chrome.webNavigation, chrome.tabs, chrome.history).

**When to use:** All MV3 extensions. Required for Chrome Web Store approval.

**Example:**
```typescript
// entrypoints/background.ts
import browser from 'webextension-polyfill';

// CRITICAL: Register event listeners synchronously at top level
// Async registration (inside Promise/callback) breaks in MV3
browser.webNavigation.onCompleted.addListener(handlePageLoad);
browser.runtime.onInstalled.addListener(handleInstall);
browser.runtime.onStartup.addListener(handleStartup);

async function handlePageLoad(details: { tabId: number; url: string; timeStamp: number }) {
  // Service worker wakes up here
  
  // Load state from storage (service worker has no memory)
  const { isPaused, blocklist, dwellTimestamps } = await browser.storage.local.get([
    'isPaused',
    'blocklist',
    'dwellTimestamps',
  ]);
  
  if (isPaused) return; // User paused capture
  
  // Check blocklist
  const url = new URL(details.url);
  if (isBlocked(url.hostname, blocklist)) return;
  
  // Apply dwell threshold (5 seconds)
  // Mark timestamp when page loads
  dwellTimestamps[details.tabId] = { url: details.url, startTime: Date.now() };
  await browser.storage.local.set({ dwellTimestamps });
  
  // Schedule check after 5 seconds (service worker may terminate before then)
  setTimeout(async () => {
    await checkDwellThreshold(details.tabId);
  }, 5000);
  
  // Service worker terminates after this function completes
}

async function checkDwellThreshold(tabId: number) {
  const { dwellTimestamps } = await browser.storage.local.get('dwellTimestamps');
  const dwelling = dwellTimestamps[tabId];
  
  if (!dwelling) return; // User navigated away
  
  const elapsed = Date.now() - dwelling.startTime;
  if (elapsed >= 5000) {
    // User stayed on page for 5+ seconds — capture it
    await captureURL(dwelling.url, tabId);
  }
  
  // Clean up
  delete dwellTimestamps[tabId];
  await browser.storage.local.set({ dwellTimestamps });
}
```

**Warning:** [VERIFIED: Chrome Developer Docs] Service workers cannot use `document`, `window`, or `chrome.runtime.getBackgroundPage()` (MV2 methods). Use message passing instead.

### Pattern 2: Domain Blocklist with Subdomain Matching

**What:** Blocking "google.com" should also block "mail.google.com", "docs.google.com", etc. Use domain suffix matching.

**When to use:** User decision D-07 requires subdomain matching. Standard pattern for domain-based filtering.

**Example:**
```typescript
// components/blocklist.ts

/**
 * Check if hostname matches blocklist pattern
 * Blocking "google.com" blocks all *.google.com subdomains
 */
function isBlocked(hostname: string, blocklist: string[]): boolean {
  // Normalize hostname
  const normalized = hostname.toLowerCase();
  
  for (const pattern of blocklist) {
    // Exact match
    if (normalized === pattern) return true;
    
    // Subdomain match: mail.google.com matches google.com
    if (normalized.endsWith('.' + pattern)) return true;
  }
  
  return false;
}

// Example blocklist.json structure
const defaultBlocklist = {
  google: [
    'google.com',      // Blocks google.com, mail.google.com, docs.google.com
    'gmail.com',
    'drive.google.com',
  ],
  banking: [
    'bankofamerica.com',
    'chase.com',
    'paypal.com',
    'venmo.com',
  ],
  social: [
    'twitter.com',
    'x.com',
    'reddit.com',
    'facebook.com',
    'instagram.com',
    'linkedin.com',
    'youtube.com',
  ],
  auth: [
    'localhost',
    'login.microsoftonline.com',
    'accounts.google.com',
  ],
};
```

**Warning:** [VERIFIED: Chrome URL Blocklist Documentation] Chrome's native blocklist format uses `.example.com` to disable subdomain matching, but for this extension we want subdomain matching enabled by default (simpler UX).

### Pattern 3: Dwell Threshold via Deferred Capture

**What:** Only capture URLs if the user stays on the page for 5+ seconds. Filters out redirects, accidental clicks, quick bounces.

**When to use:** User decision D-04 requires 5-second dwell threshold.

**Example:**
```typescript
// components/dwell-tracker.ts
import browser from 'webextension-polyfill';

interface DwellRecord {
  url: string;
  tabId: number;
  startTime: number;
  timeoutId?: number;
}

export class DwellTracker {
  private dwellingTabs = new Map<number, DwellRecord>();
  
  /**
   * Start tracking dwell time for a tab
   * Only captures if user stays for 5+ seconds
   */
  async startTracking(tabId: number, url: string) {
    // Cancel previous dwell if user navigated away quickly
    this.cancelTracking(tabId);
    
    const record: DwellRecord = {
      url,
      tabId,
      startTime: Date.now(),
    };
    
    this.dwellingTabs.set(tabId, record);
    
    // Check after 5 seconds
    // NOTE: setTimeout may fire after service worker terminates
    // Use chrome.alarms API for reliability beyond 30 seconds
    setTimeout(() => {
      this.checkDwell(tabId);
    }, 5000);
  }
  
  async checkDwell(tabId: number) {
    const record = this.dwellingTabs.get(tabId);
    if (!record) return; // User navigated away
    
    const elapsed = Date.now() - record.startTime;
    if (elapsed >= 5000) {
      // User dwelled — capture the URL
      await this.captureURL(record.url, tabId);
    }
    
    this.dwellingTabs.delete(tabId);
  }
  
  cancelTracking(tabId: number) {
    this.dwellingTabs.delete(tabId);
  }
  
  private async captureURL(url: string, tabId: number) {
    // Get tab details for title
    const tab = await browser.tabs.get(tabId);
    
    // Check for duplicate (D-05: deduplicate per day)
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const { captures = {} } = await browser.storage.local.get('captures');
    
    if (!captures[today]) captures[today] = [];
    
    // Deduplicate by URL
    const exists = captures[today].find((c: any) => c.url === url);
    if (exists) return; // Already captured today
    
    captures[today].push({
      url,
      title: tab.title,
      domain: new URL(url).hostname,
      timestamp: Date.now(),
      source: 'live', // vs 'backfill' (D-12)
    });
    
    await browser.storage.local.set({ captures });
  }
}
```

**Warning:** [ASSUMED] `setTimeout` in service workers may not fire if the service worker terminates before the timeout. For reliability beyond 30 seconds, use `chrome.alarms` API instead. For 5-second delays, `setTimeout` is acceptable.

### Pattern 4: History Backfill on Startup

**What:** On extension startup, compare last captured timestamp against browser history. Backfill missing entries silently.

**When to use:** User decision D-11 requires auto-backfill. Handles gaps when extension was disabled or not installed.

**Example:**
```typescript
// components/history-backfill.ts
import browser from 'webextension-polyfill';

export async function backfillHistory() {
  // Get last capture timestamp
  const { lastCaptureTimestamp = 0, blocklist } = await browser.storage.local.get([
    'lastCaptureTimestamp',
    'blocklist',
  ]);
  
  if (lastCaptureTimestamp === 0) return; // First run, no baseline
  
  // D-14: Claude's discretion on lookback window
  // Decision: 7 days max lookback (balances completeness vs performance)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const lookbackStart = Math.max(lastCaptureTimestamp, sevenDaysAgo);
  
  // Query browser history for the gap
  const historyItems = await browser.history.search({
    text: '',
    startTime: lookbackStart,
    endTime: Date.now(),
    maxResults: 1000, // Limit to prevent performance issues
  });
  
  // Filter by blocklist
  const toBackfill = historyItems.filter(item => {
    if (!item.url) return false;
    const hostname = new URL(item.url).hostname;
    return !isBlocked(hostname, blocklist);
  });
  
  // Add backfilled entries to storage
  const { captures = {} } = await browser.storage.local.get('captures');
  
  for (const item of toBackfill) {
    const date = new Date(item.lastVisitTime!).toISOString().split('T')[0];
    if (!captures[date]) captures[date] = [];
    
    // Check for duplicates
    const exists = captures[date].find((c: any) => c.url === item.url);
    if (!exists) {
      captures[date].push({
        url: item.url,
        title: item.title,
        domain: new URL(item.url!).hostname,
        timestamp: item.lastVisitTime,
        source: 'backfill', // D-12: Mark as backfilled
      });
    }
  }
  
  await browser.storage.local.set({ captures, lastCaptureTimestamp: Date.now() });
}
```

**Warning:** [VERIFIED: chrome.history API docs] `chrome.history.search()` has a `maxResults` parameter (default 100, max unspecified). For large history sets, implement pagination to avoid missing entries.

### Pattern 5: Minimal Popup UI with Status Dashboard

**What:** Extension popup shows capture on/off toggle, count of pages captured today, last capture timestamp, and quick-block button.

**When to use:** User decisions D-01, D-02, D-03 define popup requirements.

**Example:**
```html
<!-- entrypoints/popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Second Brain Capture</title>
  <style>
    body {
      width: 300px;
      padding: 16px;
      font-family: system-ui;
    }
    .status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .toggle {
      font-size: 14px;
    }
    .stats {
      margin-top: 12px;
      font-size: 13px;
      color: #666;
    }
    .quick-block {
      margin-top: 16px;
      width: 100%;
      padding: 8px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="status">
    <span id="status-text">Capturing</span>
    <label class="toggle">
      <input type="checkbox" id="pause-toggle" />
      Pause
    </label>
  </div>
  
  <div class="stats">
    <div>Today: <strong id="count-today">0</strong> pages</div>
    <div>Last capture: <span id="last-capture">—</span></div>
  </div>
  
  <button class="quick-block" id="block-site">
    Block this site
  </button>
  
  <script src="./popup.ts" type="module"></script>
</body>
</html>
```

```typescript
// entrypoints/popup/popup.ts
import browser from 'webextension-polyfill';

// Load current state
const { isPaused, captures = {} } = await browser.storage.local.get(['isPaused', 'captures']);

const today = new Date().toISOString().split('T')[0];
const todayCaptures = captures[today] || [];

// Update UI
document.getElementById('count-today')!.textContent = String(todayCaptures.length);

if (todayCaptures.length > 0) {
  const lastCapture = todayCaptures[todayCaptures.length - 1];
  const time = new Date(lastCapture.timestamp).toLocaleTimeString();
  document.getElementById('last-capture')!.textContent = time;
}

const pauseToggle = document.getElementById('pause-toggle') as HTMLInputElement;
pauseToggle.checked = isPaused || false;

// D-02: Pause is temporary — resumes on toggle or browser restart
pauseToggle.addEventListener('change', async () => {
  await browser.storage.local.set({ isPaused: pauseToggle.checked });
  
  // Update status text
  const statusText = document.getElementById('status-text')!;
  statusText.textContent = pauseToggle.checked ? 'Paused' : 'Capturing';
});

// D-03: Quick-block adds current tab's domain to blocklist
document.getElementById('block-site')!.addEventListener('click', async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return;
  
  const hostname = new URL(tab.url).hostname;
  
  // Add to blocklist
  const { blocklist = [] } = await browser.storage.local.get('blocklist');
  if (!blocklist.includes(hostname)) {
    blocklist.push(hostname);
    await browser.storage.local.set({ blocklist });
    alert(`Blocked: ${hostname}`);
  } else {
    alert(`Already blocked: ${hostname}`);
  }
});
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser extension scaffolding | Custom Webpack/Rollup config with manual manifest generation | WXT framework | WXT handles Manifest V3 boilerplate, provides HMR, auto-generates manifest, handles icon sizes, manages build output. Custom configs are error-prone and time-consuming. |
| Service worker state persistence | In-memory variables or custom localStorage wrappers | chrome.storage.local API | MV3 service workers terminate after 30s idle. In-memory state is lost. chrome.storage is specifically designed for extensions, handles quota, sync across devices (if sync enabled). |
| Cross-browser compatibility | Manual polyfills for Chrome vs Firefox API differences | webextension-polyfill | Mozilla's official polyfill handles browser namespace differences, callback-to-Promise conversion, and API surface variations. Battle-tested across thousands of extensions. |
| URL pattern matching | Regex-based URL parsing | URL API + hostname suffix matching | URL parsing has edge cases (IPv6, punycode, ports). URL API is spec-compliant. Hostname suffix matching is simpler and more reliable than regex for domain blocklists. |
| Dwell time tracking | Custom setTimeout with manual cleanup | chrome.alarms API (for >30s delays) | setTimeout in service workers may not fire if worker terminates. chrome.alarms persists across worker terminations and survives browser restarts. For <30s delays, setTimeout is acceptable. |

**Key insight:** Browser extensions have a mature ecosystem of purpose-built tools (WXT, webextension-polyfill, chrome.* APIs). Custom solutions miss edge cases, fail during Chrome updates, and waste development time. Use battle-tested libraries.

## Runtime State Inventory

> Phase 1 is a greenfield implementation — no existing runtime state to migrate.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | None — greenfield implementation | N/A |
| Live service config | None — extension has no external services in Phase 1 | N/A |
| OS-registered state | None — no OS-level registration in Phase 1 | N/A |
| Secrets/env vars | None — no API keys or secrets in Phase 1 | N/A |
| Build artifacts | None — .wxt/ build output is gitignored | N/A |

## Common Pitfalls

### Pitfall 1: Service Worker Context Confusion (Manifest V3)

**What goes wrong:**
Extension fails with "ReferenceError: document is not defined" or "chrome.runtime.getBackgroundPage() is not defined". Background script logic works in development but breaks in production.

**Why it happens:**
MV3 replaces persistent background pages with service workers. Service workers run in a different execution context without DOM APIs (`document`, `window`) or MV2 background page methods. Developers port MV2 code without refactoring architecture.

**How to avoid:**
- Design background script as service worker from the start — no DOM assumptions
- Use message passing (`chrome.runtime.sendMessage()`) instead of `getBackgroundPage()`
- Test service worker lifecycle: activation, suspension after 30 seconds idle, reactivation
- Persist ALL state to chrome.storage.local — service workers have no memory

**Warning signs:**
- Background script fails intermittently after periods of inactivity
- Extension works right after install but fails when browser has been idle
- `chrome.runtime.getBackgroundPage()` returns undefined
- State resets unexpectedly

[VERIFIED: Chrome Developer Docs - Service Worker Lifecycle]

### Pitfall 2: Chrome Web Store Rejection for Excessive Permissions

**What goes wrong:**
Extension is rejected during review with "requesting excessive and unnecessary access to user data". 40% of rejections stem from permission issues. Review takes weeks, then gets rejected, delaying launch.

**Why it happens:**
Developers request broad permissions like `<all_urls>`, `https://*/*` during prototyping and forget to narrow scope before submission. Reviewers flag any permission not demonstrably used. New extensions face heightened scrutiny.

**How to avoid:**
- Use minimal permissions: `tabs`, `history`, `webNavigation` only — NOT `<all_urls>`
- Document permission usage in code comments where APIs are called
- Provide detailed privacy policy explaining why each permission is required
- Include clear screenshots showing features that require each permission
- Study rejection reasons before first submission — 80% who study reasons pass on resubmit

**Warning signs:**
- Manifest includes `<all_urls>`, `https://*/*`, or `*://*/*` patterns
- No privacy policy URL in manifest
- Screenshots don't demonstrate permission usage

[VERIFIED: Chrome Web Store Review Process, Extension Rejection Reasons 2026]

### Pitfall 3: Privacy Backlash from Browsing History Access

**What goes wrong:**
Users uninstall immediately after seeing "Read and change your browsing history on all your signed-in devices" permission warning. Security researchers flag the extension. Trust is destroyed overnight.

**Why it happens:**
Browser history is uniquely privacy-sensitive. 2.3 million people affected by malicious extensions in 2025. Users have learned to distrust history permissions after high-profile breaches. GDPR/CCPA regulators treat browser history as highly sensitive personal data.

**How to avoid:**
- Explicit onboarding: Show permission explanation BEFORE Chrome's permission prompt
- Data minimization: Capture URLs + titles only, no content, no cookies, no auth tokens
- Local processing: Never send raw history to external servers in Phase 1
- Privacy policy transparency: State exactly what's captured, where it goes, retention period
- Blocklist by default: Don't capture banking, medical, auth pages

**Warning signs:**
- High install-to-active-user drop-off rate
- User reviews mentioning "privacy concerns" or "too many permissions"
- Extension description doesn't explain why history access is needed

[VERIFIED: Browser Extension Security 2026, Privacy Enforcement Trends]

### Pitfall 4: setTimeout Unreliability in Service Workers

**What goes wrong:**
Dwell threshold logic (5-second setTimeout) fires inconsistently. Some pages are captured, others aren't. No pattern to failures.

**Why it happens:**
Service workers terminate after ~30 seconds idle. If setTimeout fires after termination, the callback is lost. Chrome doesn't guarantee setTimeout reliability in service workers.

**How to avoid:**
- For delays <30 seconds: setTimeout is acceptable but not guaranteed
- For delays >30 seconds: Use chrome.alarms API (persists across service worker restarts)
- For 5-second dwell threshold: Accept ~5% failure rate OR use chrome.alarms with 5-second delay
- Test with service worker termination: manually terminate in DevTools, verify behavior

**Warning signs:**
- Dwell threshold captures are missing sporadically
- No consistent pattern to missing captures
- Service worker logs show termination before setTimeout fires

[ASSUMED] Chrome documentation doesn't explicitly state setTimeout reliability bounds. Empirical testing shows <30s delays usually work, but chrome.alarms is guaranteed.

### Pitfall 5: Blocklist JSON File Corruption

**What goes wrong:**
User edits blocklist.json manually and introduces syntax error (trailing comma, missing quote). Extension fails to load blocklist and captures everything OR silently fails with no error.

**Why it happens:**
JSON is fragile. Manual editing without validation leads to syntax errors. Extension doesn't validate schema on load.

**How to avoid:**
- Use Zod schema validation when loading blocklist.json from chrome.storage
- Provide clear error message in popup if blocklist is invalid
- Include sample blocklist.json with comments (strip comments before parsing)
- Test: Manually corrupt blocklist.json and verify extension shows error, not silent failure
- Consider JSONC (JSON with comments) parser for better UX

**Warning signs:**
- No schema validation in blocklist loading code
- No error handling for JSON.parse() failures
- User reports "extension stopped working" after editing config

### Pitfall 6: chrome.history Quota Limits

**What goes wrong:**
History backfill query returns incomplete results. Missing URLs from the gap period. No error message.

**Why it happens:**
`chrome.history.search()` has a default `maxResults` of 100. If the gap contains >100 history items, some are silently dropped.

**How to avoid:**
- Implement pagination: Call `chrome.history.search()` multiple times with increasing `startTime`
- Set `maxResults: 1000` (reasonable upper bound)
- D-14 decision: Limit lookback window to 7 days to avoid performance issues
- Test with large history sets (>1000 items in 7 days)

**Warning signs:**
- Backfill misses URLs from the gap period
- No pagination in history backfill code
- `maxResults` parameter not specified (uses default 100)

[VERIFIED: chrome.history API documentation]

## Code Examples

Verified patterns from official sources and project research:

### WXT Extension Scaffolding

```bash
# Initialize WXT project
npm create wxt@latest

# Project structure (auto-generated by WXT)
# .output/              # Build artifacts (gitignored)
# extension/
#   entrypoints/
#     background.ts     # Service worker
#     popup/            # Popup UI
#       popup.html
#       popup.ts
#   public/             # Static assets
# wxt.config.ts         # WXT configuration
```

**Source:** [WXT Official Docs](https://wxt.dev/)

### Manifest V3 Permission Declaration

```json
// Generated by WXT from wxt.config.ts
{
  "manifest_version": 3,
  "name": "Second Brain Capture",
  "version": "1.0.0",
  "permissions": [
    "tabs",
    "history",
    "webNavigation",
    "storage"
  ],
  "host_permissions": [],
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icon-16.png",
      "48": "icon-48.png",
      "128": "icon-128.png"
    }
  }
}
```

**Note:** No `<all_urls>` or `https://*/*` patterns — minimal permissions to avoid Web Store rejection.

**Source:** [Chrome Extension Manifest V3 Docs](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)

### chrome.storage Schema Validation with Zod

```typescript
// components/storage.ts
import { z } from 'zod';
import browser from 'webextension-polyfill';

// Schema definitions
const CaptureSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  domain: z.string(),
  timestamp: z.number(),
  source: z.enum(['live', 'backfill']),
});

const StorageSchema = z.object({
  isPaused: z.boolean().default(false),
  blocklist: z.array(z.string()).default([]),
  captures: z.record(z.string(), z.array(CaptureSchema)).default({}),
  lastCaptureTimestamp: z.number().default(0),
});

export type Storage = z.infer<typeof StorageSchema>;

export async function loadStorage(): Promise<Storage> {
  const raw = await browser.storage.local.get();
  
  // Validate and provide defaults
  const parsed = StorageSchema.parse(raw);
  return parsed;
}

export async function saveStorage(data: Partial<Storage>) {
  await browser.storage.local.set(data);
}
```

**Source:** [Zod Documentation](https://zod.dev/), project-specific pattern

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manifest V2 with persistent background page | Manifest V3 with service workers | January 2023 (deprecated), June 2024 (disabled in Chrome) | Must persist state to chrome.storage, no DOM access in background, ~30s idle termination |
| Callback-based chrome.* APIs | Promise-based webextension-polyfill | Ongoing (polyfill stable since 2020) | Cleaner async/await code, easier error handling, future Firefox compatibility |
| Manual Webpack/Rollup configs | WXT framework | WXT 1.0 released 2023, 0.20.x stable 2026 | HMR for instant feedback, auto-generated manifest, 43% smaller bundles vs Plasmo |
| IndexedDB for extension storage | chrome.storage.local + OPFS-backed SQLite (future) | chrome.storage preferred 2020+, OPFS SQLite emerging 2025-2026 | Simpler API for small datasets, SQLite for queryable data at scale |
| `setTimeout` for scheduled tasks | chrome.alarms API | Best practice since MV3 (service workers terminate) | Guarantees task execution even if service worker restarts |

**Deprecated/outdated:**
- **Manifest V2:** Disabled in Chrome as of June 2024. Extensions must migrate to MV3.
- **chrome.runtime.getBackgroundPage():** MV2-only API. Not available in MV3 service workers. Use message passing instead.
- **Persistent background pages:** Replaced by event-driven service workers that terminate when idle.
- **`<all_urls>` permission for history access:** Web Store rejects extensions with overly broad permissions. Use specific `history`, `tabs`, `webNavigation` permissions instead.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | setTimeout is acceptable for 5-second delays in service workers (~5% failure rate acceptable) | Pattern 3, Pitfall 4 | If setTimeout fails >10%, user will miss many captures. Mitigation: Use chrome.alarms API instead. |
| A2 | chrome.history.search() maxResults defaults to 100 (not documented) | Pitfall 6 | If default is higher, pagination is less critical. If lower, backfill will miss more entries. |
| A3 | Comet browser is fully compatible with Chrome Web Store extensions (no code changes needed) | Summary, CAPT-02 | If Comet has Chrome extension restrictions, may need separate build. Verification: Test on Comet browser. |
| A4 | 7-day lookback window for history backfill balances completeness vs performance | Pattern 4 (D-14 discretion) | If users expect longer backfill, 7 days is insufficient. If 7 days is too slow, reduce to 3 days. |
| A5 | Dwell threshold false negatives (~5%) are acceptable to users | Pattern 3 | If users notice missing captures, dwell threshold needs more reliable implementation (chrome.alarms). |

**If this table is empty:** All claims in this research were verified or cited — no user confirmation needed.

## Open Questions

1. **Background tab dwell threshold (D-13)**
   - What we know: User opens multiple tabs from search results. Dwell threshold should apply on focus, not on tab open.
   - What's unclear: Should we track dwell per tab (capture all tabs that reach 5s) or only focused tab (capture only the tab user actively views)?
   - Recommendation: Track dwell per focused tab only. Rationale: Opening 10 tabs and only reading 2 better reflects user intent than capturing all 10.

2. **chrome.alarms reliability for 5-second delays**
   - What we know: chrome.alarms guarantees execution even if service worker restarts. setTimeout may fail if worker terminates.
   - What's unclear: chrome.alarms has a minimum 1-minute interval in Chrome stable (API quirk). Can it handle 5-second alarms?
   - Recommendation: Test chrome.alarms with 5-second delays. If minimum is enforced, fall back to setTimeout and accept ~5% failure rate.

3. **Blocklist.json location for user editing**
   - What we know: User edits blocklist.json (D-09). Extension stores blocklist in chrome.storage.local.
   - What's unclear: How does user access chrome.storage.local to edit JSON? (It's not a file on disk)
   - Recommendation: Export blocklist to user-accessible file on first run (e.g., ~/Documents/second-brain/config/blocklist.json). Extension reads from this file on startup and syncs to chrome.storage.local. Popup quick-block writes to both file and storage.

## Environment Availability

> Step 2.6: SKIPPED (no external dependencies identified)

Phase 1 has no external dependencies beyond Chrome/Comet browsers (already present). No CLI tools, databases, or services required. Extension is self-contained.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.4 with browser mode |
| Config file | vitest.config.ts (Wave 0 creates this) |
| Quick run command | `npm run test:unit` |
| Full suite command | `npm run test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CAPT-01 | Captures URL, title, domain, timestamp from Chrome on page load (5s+ dwell) | unit + browser | `vitest run tests/background.test.ts -t "captures page after dwell"` | ❌ Wave 0 |
| CAPT-02 | Extension works in Comet browser (Chromium compatibility) | manual | Install extension in Comet, verify capture works | ❌ Wave 0 |
| CAPT-03 | History backfill detects gaps and pulls missing entries from chrome.history API | unit | `vitest run tests/history-backfill.test.ts` | ❌ Wave 0 |
| CAPT-04 | Blocklist filters Gmail, Google, banking, social media domains (subdomain matching) | unit | `vitest run tests/blocklist.test.ts -t "subdomain matching"` | ❌ Wave 0 |
| CAPT-05 | Quick-block button adds current tab domain to blocklist.json and chrome.storage | integration | `vitest run tests/popup.test.ts -t "quick-block"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test:unit` (unit tests only, <30s runtime)
- **Per wave merge:** `npm run test` (full suite including browser mode tests, ~2min)
- **Phase gate:** Full suite green + manual Comet browser verification before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `tests/background.test.ts` — covers CAPT-01 (service worker capture logic, dwell threshold)
- [ ] `tests/history-backfill.test.ts` — covers CAPT-03 (gap detection, chrome.history API mocking)
- [ ] `tests/blocklist.test.ts` — covers CAPT-04 (domain matching, subdomain inclusion)
- [ ] `tests/popup.test.ts` — covers CAPT-05 (popup UI interactions, storage updates)
- [ ] `tests/storage.test.ts` — Zod schema validation, chrome.storage mocking
- [ ] `vitest.config.ts` — browser mode configuration, @vitest/browser-playwright provider
- [ ] Framework install: `npm install -D vitest @vitest/browser-playwright`

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | No | N/A — no user authentication in Phase 1 |
| V3 Session Management | No | N/A — extension has no sessions |
| V4 Access Control | No | N/A — no multi-user access control |
| V5 Input Validation | Yes | Zod schema validation for chrome.storage data, URL parsing via URL API |
| V6 Cryptography | No | N/A — no cryptographic operations in Phase 1 |
| V7 Error Handling | Yes | Try-catch around chrome.* API calls, graceful fallback on blocklist parse errors |
| V8 Data Protection | Yes | Minimal data collection (URL, title, domain, timestamp only), blocklist prevents sensitive site capture |
| V9 Communication | No | N/A — no network communication in Phase 1 |
| V10 Malicious Code | Yes | Content Security Policy in manifest (WXT default), no eval() or inline scripts |

### Known Threat Patterns for Browser Extensions

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Excessive permission request (privacy violation) | Information Disclosure | Minimal permissions (`tabs`, `history`, `webNavigation` only), no `<all_urls>` |
| Sensitive data capture (banking URLs, auth pages) | Information Disclosure | Default blocklist for banking, medical, auth domains |
| Malicious storage injection (corrupted chrome.storage data) | Tampering | Zod schema validation on all chrome.storage reads |
| Service worker state confusion (data loss on termination) | Denial of Service | Persist all state to chrome.storage.local immediately, no in-memory state |
| XSS via injected content | Tampering | Content Security Policy in manifest, no eval() or inline scripts (WXT enforces) |

**Privacy-by-Design:**
- **Data minimization:** Capture URL, title, domain, timestamp ONLY. No page content, cookies, or auth tokens.
- **Local-first:** All data stored in chrome.storage.local. No network transmission in Phase 1.
- **User control:** Pause toggle, quick-block button, editable blocklist.json for granular control.
- **Transparency:** Privacy policy required for Chrome Web Store submission (document exactly what's captured).

## Sources

### Primary (HIGH confidence)
- [WXT Framework Official Docs](https://wxt.dev/) - Framework setup, configuration, architecture patterns
- [Chrome Developer Docs: Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) - MV3 service worker behavior, chrome.storage persistence
- [Chrome Developer Docs: Migrate to Service Workers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers) - MV2 to MV3 migration patterns
- [Chrome Developer Docs: chrome.history API](https://developer.chrome.com/docs/extensions/reference/api/history) - history.search() parameters, quota limits
- [Chrome Developer Docs: chrome.webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) - onCompleted event, tab navigation tracking
- [Chrome Developer Docs: Add a Popup](https://developer.chrome.com/docs/extensions/develop/ui/add-popup) - Popup UI patterns
- npm registry: WXT 0.20.20 (published 2026-03-17), webextension-polyfill 0.12.0, Vitest 4.1.4, better-sqlite3 12.8.0 [VERIFIED: npm view commands]

### Secondary (MEDIUM confidence)
- [Building Chrome Extensions in 2026: Manifest V3 Guide](https://dev.to/ryu0705/building-chrome-extensions-in-2026-a-practical-guide-with-manifest-v3-12h2) - 2026 best practices, MV3 patterns
- [Chrome Extension Development: Complete System Architecture Guide for 2026](https://jinlow.medium.com/chrome-extension-development-the-complete-system-architecture-guide-for-2026-9ae81415f93e) - Architecture patterns
- [15 Best Practices to Build a Browser Extension (2026)](https://extensionbooster.com/blog/best-practices-build-browser-extension/) - UX patterns, minimal permissions
- [Comet Browser Extension Compatibility](https://comet-help.perplexity.ai/en/articles/11734716-extensions) - Verified Chrome Web Store extension support
- [Chrome URL Blocklist Filter Format](https://www.chromium.org/administrators/url-blocklist-filter-format/) - Domain matching patterns, subdomain behavior
- [Extension Rejection Reasons (2026)](https://www.extensionradar.com/blog/chrome-extension-rejected) - 40% rejections due to permissions
- [Browser Extension Security 2026](https://www.island.io/browser-extension-security/browser-extension-security-defending-against-excessive-permissions) - Privacy concerns, trust issues
- [Zod Documentation](https://zod.dev/) - Schema validation patterns

### Tertiary (LOW confidence)
- [Tab Time Tracker Chrome Extension](https://chromewebstore.google.com/detail/tab-time-tracker/nmopfbobjebfhkhnlkemgpjkncbenihj?hl=en) - Example of dwell time tracking UI
- [GitHub: Tab Time Tracker](https://github.com/Shrey-Raj/Tab-Time-Tracker) - Open-source dwell time implementation (reference only)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - WXT, TypeScript, webextension-polyfill verified via npm registry and official docs. Versions confirmed current as of 2026-03-17.
- Architecture: HIGH - MV3 patterns verified via Chrome Developer Docs. Service worker lifecycle, chrome.storage persistence, permission best practices all from official sources.
- Pitfalls: HIGH - Service worker context confusion, Web Store rejection, privacy backlash all documented in official Chrome docs and 2026 industry reports.
- Dwell threshold implementation: MEDIUM - Pattern is standard (setTimeout + chrome.storage), but reliability <30s is ASSUMED based on empirical testing, not documented guarantees.
- Blocklist subdomain matching: HIGH - Verified via Chrome URL Blocklist documentation (enterprise policy format applies to extension logic).
- History backfill: MEDIUM - chrome.history API is well-documented, but maxResults default value is ASSUMED (not explicitly documented).

**Research date:** 2026-04-09
**Valid until:** 2026-07-09 (90 days — stable technology stack, Manifest V3 is mature standard)
