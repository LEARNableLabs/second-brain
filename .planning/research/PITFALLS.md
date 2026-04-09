# Pitfalls Research

**Domain:** Automated browsing capture + AI curation
**Researched:** 2026-04-09
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Service Worker Context Confusion (Manifest V3)

**What goes wrong:**
Extension fails with "ReferenceError: document is not defined" or "chrome.runtime.getBackgroundPage() is not defined". Background script logic that worked in Manifest V2 breaks completely in production.

**Why it happens:**
Manifest V3 replaces persistent background pages with service workers. Service workers run in a different execution context without access to DOM APIs (`document`, `window`) or background page methods (`chrome.runtime.getBackgroundPage()`, `chrome.extension.getExtensionTabs()`). Developers migrate the manifest version field without refactoring background script architecture.

**How to avoid:**
- Design background script as a service worker from the start — no DOM assumptions
- Use message passing (`chrome.runtime.sendMessage()`) instead of direct background page access
- Test service worker lifecycle: activation, suspension after 30 seconds idle, reactivation
- Store state in chrome.storage APIs, not in-memory variables (service worker can terminate)

**Warning signs:**
- Background script logs show intermittent failures after periods of inactivity
- Extension works immediately after install but fails after browser has been idle
- `chrome.runtime.getBackgroundPage()` calls return undefined
- State/variables reset unexpectedly

**Phase to address:**
Phase 1 (Extension foundation) — Implement as service worker from the beginning, not as a retrofit.

---

### Pitfall 2: Vault Corruption from Concurrent Writes

**What goes wrong:**
Daily markdown files become corrupted with null characters, duplicate content, or partial writes. Obsidian shows "File not found" errors or renders garbled content. Sync conflicts multiply (`workspace (Desktop's conflicted copy 2026-04-09).json`).

**Why it happens:**
Multiple processes write to the same vault simultaneously: your automation script updates the daily note while Obsidian auto-saves workspace state while sync service (iCloud/OneDrive) locks files. Without file locking or atomic writes, interleaved writes corrupt files. Git and iCloud particularly "don't play nice" — iCloud locks files during sync, Git tries to lock during operations, files get corrupted.

**How to avoid:**
- Never write to `.obsidian/` config directory from automation — let Obsidian own it
- Use atomic write pattern: write to temporary file → verify integrity → rename to final location
- Check for Obsidian process locks before writing (use `lsof` on macOS)
- Write to dated files (`2026-04-09-browsing.md`) during curation, don't append to currently-open daily notes
- If using iCloud/OneDrive sync: add `.obsidian/workspace.json` to ignore list, don't sync it
- Test: Run automation while Obsidian is open and actively editing the target file

**Warning signs:**
- Files in `.obsidian/` named like `workspace (SurfaceBook's conflicted copy 2025-12-15).json`
- Markdown files open to show null bytes or truncated content
- Git shows merge conflicts in workspace.json constantly
- Obsidian prompts about file changes made externally

**Phase to address:**
Phase 2 (File writing foundation) — Implement safe write patterns before any automation runs in production.

---

### Pitfall 3: Chrome Web Store Rejection for Excessive Permissions

**What goes wrong:**
Extension is rejected during review with "requesting excessive and unnecessary access to user data". 40% of rejections stem from permission issues. Extension languishes in "Pending review" for weeks, then gets rejected, delaying launch.

**Why it happens:**
Developers request broad permissions like `<all_urls>`, `https://*/*`, `tabs`, `history` during prototyping and forget to narrow scope before submission. Reviewers flag any permission not demonstrably used in the extension. New extensions and new developers face heightened scrutiny. The extension actually uses the permission but reviewers can't verify usage from code review.

**How to avoid:**
- Use minimal permissions: request `history` (browsing data) but NOT `<all_urls>` (access to all sites)
- Document permission usage in code comments where permissions are used
- Provide detailed privacy policy explaining why each permission is required
- Use `optional_permissions` for features that could work without them
- Test extension functions with minimal permission set
- Include clear screenshots showing the feature that requires each permission
- Study rejection reasons before first submission — 80% who study reasons pass on resubmit

**Warning signs:**
- Manifest includes `<all_urls>`, `https://*/*`, or `*://*/*` patterns
- Permission list includes `tabs`, `webRequest`, `cookies` without clear necessity
- No privacy policy URL in manifest
- Screenshots don't demonstrate permission usage

**Phase to address:**
Phase 1 (Extension foundation) — Design with minimal permissions from the start. Validate permission list before first Web Store submission.

---

### Pitfall 4: Privacy Backlash from Browsing History Access

**What goes wrong:**
Users uninstall immediately after seeing "Read and change your browsing history on all your signed-in devices" permission warning. Security researchers flag the extension. Trust Wallet-style incident where extension works fine for months then trust is destroyed overnight.

**Why it happens:**
Browser history is uniquely privacy-sensitive. 2.3 million people were affected by malicious extensions in 2025 alone. Users have learned to distrust history permissions after high-profile breaches (WeTab spyware incident, Trust Wallet $7M theft). The permission warning language is intentionally scary. GDPR/CCPA regulators treat browser history as highly sensitive personal data requiring explicit consent and purpose limitation.

**How to avoid:**
- Explicit onboarding: Show permission dialog with clear explanation BEFORE Chrome's permission prompt
- Data minimization: Capture URLs + titles only, no content, no cookies, no auth tokens
- Local processing: Never send raw history to external servers — process locally first
- Swappable LLM provider: Allow local-only AI processing (Ollama/llama.cpp) as alternative to Claude API
- Privacy policy transparency: State exactly what's captured, where it goes, retention period
- Open source consideration: Public codebase builds trust for sensitive permissions
- Blocklist by default: Don't capture banking, medical, auth pages (Gmail, bank sites)

**Warning signs:**
- High install-to-active-user drop-off rate
- User reviews mentioning "privacy concerns" or "too many permissions"
- Extension description doesn't explain why history access is needed
- No mention of local processing or data handling in store listing

**Phase to address:**
Phase 1 (Extension foundation) — Implement privacy-first architecture from the beginning. Privacy retrofits erode trust.

---

### Pitfall 5: AI Hallucination in Clustering

**What goes wrong:**
Daily digest claims "you looked at 4 RL papers today" when you only looked at 1 RL paper and 3 unrelated ML articles. LLM invents topic relationships that don't exist. Unread queue flags items as "opened but not read" when you actually read them. Users lose trust in curation accuracy.

**Why it happens:**
LLMs optimize for confident guessing over calibrated uncertainty (next-token training objectives reward bluffing). Average hallucination rate across models for general knowledge questions is 9.2% in 2026. Complex chain-of-thought reasoning models (like OpenAI o3) hallucinate MORE on factual benchmarks (33-51% on PersonQA/SimpleQA). Clustering requires interpreting sparse signals (just URL + title) into semantic groups. No ground truth feedback loop to correct mistakes.

**How to avoid:**
- Prompt engineering: Explicit instruction to say "uncertain" rather than guess
- RAG verification: Match clustered topics against existing vault wikilinks to ground in user's actual knowledge graph
- Confidence thresholds: Only surface clusters with >70% model confidence
- Multi-model validation: Use cheap model for initial clustering, better model for verification
- Human-in-loop: Show curation with edit UI, let user correct mistakes
- Explicit fallback: If clustering confidence is low, present chronological list instead of invented topics
- Track accuracy: Log user corrections to measure hallucination rate over time

**Warning signs:**
- Clusters have generic names ("Interesting articles") instead of specific topics
- Same URL appears in multiple contradictory clusters
- Cluster descriptions don't match the actual URLs in the cluster
- "Unread queue" logic is based purely on time-on-page heuristics (unreliable)

**Phase to address:**
Phase 3 (AI curation) — Design with hallucination mitigation from the start. Test clustering accuracy before shipping.

---

### Pitfall 6: LLM Token Costs Spiral Out of Control

**What goes wrong:**
Daily curation costs $2-5 per user per day instead of $0.10-0.30. Monthly bill for personal use hits $100+. Costs scale linearly with browsing volume, making heavy users uneconomical.

**Why it happens:**
RAG pipelines pass 4-8 long documents into prompts when only snippets are needed. No prompt caching for repeated content (e.g., blocklist, vault wikilinks). Output tokens cost 3-8× more than input tokens but prompts don't constrain output length. Processing every single URL instead of filtering low-value pages first. No batching — each day's curation runs as separate API call with full context.

**How to avoid:**
- Aggressive input filtering: Apply blocklist BEFORE sending to LLM (cuts input 50-70%)
- Prompt caching: Use Anthropic's prompt caching for vault wikilinks context (90% cost reduction on cached tokens: $0.30/M vs $3.00/M)
- Chunk size limits: Truncate URL titles to 100 chars, domains to 50 chars
- Output constraints: Specify max cluster count, max summary length in prompt
- Relevance scoring: Filter retrievals to top 2-3 chunks with minimum confidence threshold
- Semantic deduplication: Remove near-duplicate URLs before LLM sees them (e.g., same article on different domains)
- Batch processing: Single API call per day with all URLs, not per-URL calls
- Model selection: Use Claude Haiku for clustering, Sonnet only for final summary

**Warning signs:**
- Token usage grows linearly with browsing volume
- Input token count >10k for typical daily digest
- No caching hit rate metrics in logs
- Every URL in browsing history is sent to LLM unfiltered

**Phase to address:**
Phase 3 (AI curation) — Build cost optimization into initial architecture. Retrofitting is expensive.

---

### Pitfall 7: macOS Scheduling Unreliability (launchd/cron)

**What goes wrong:**
End-of-day curation doesn't run. Runs at wrong time after DST transition (1 hour off). Fails silently with no error logs. Works perfectly in testing, fails in production when Mac sleeps or user isn't logged in.

**Why it happens:**
Cron doesn't run if Mac is asleep — only executes when system is awake. Cron daemon lacks Full Disk Access permission on Mojave+ (macOS kills process silently if accessing Desktop/Documents). DST transitions shift "11 PM" by an hour but cron doesn't adjust. Launchd is fussy with syntax — error code 5 (I/O error) is cryptic. User-level launchd agents don't run when user isn't logged in.

**How to avoid:**
- Use launchd not cron: launchd runs missed jobs when computer wakes
- Grant Full Disk Access: Add automation script to System Settings → Privacy & Security → Full Disk Access
- UTC scheduling: Schedule in UTC to avoid DST complexity, convert to local time in script
- User login requirement: Document that automation requires user to be logged in (LaunchAgent not LaunchDaemon)
- WatchPath alternative: Instead of time-based triggers, use launchd WatchPath on Obsidian vault — trigger when daily note is created
- Logging: Write to ~/Library/Logs/ with explicit error messages, not stderr
- Test sleep scenarios: Schedule job, put Mac to sleep during trigger window, verify it runs on wake

**Warning signs:**
- Job runs perfectly when manually triggered but not on schedule
- Cron job succeeds in test environment but fails in production
- No logs in /var/log/system.log or ~/Library/Logs/
- Jobs scheduled between 1-3 AM don't run reliably (DST transition window)
- Error: "Operation not permitted" in logs (permission issue)

**Phase to address:**
Phase 4 (Scheduling automation) — Test launchd configuration on fresh Mac with typical sleep patterns before considering it working.

---

### Pitfall 8: Gmail API Rate Limiting

**What goes wrong:**
Morning email digest fails to send with 429 "User rate limit exceeded" error. Works fine in testing with 1-2 emails, fails in production. During debugging (sending test emails repeatedly), rate limit gets hit and locks out for 60 seconds.

**Why it happens:**
Gmail API enforces 250 quota units/second per-user rate limit. Sending costs 100 units = max ~2.5 emails/second. Per-project limit is 1,200,000 units/minute but per-USER limit is 15,000 units/minute (150 sends/minute = 2.5/second). Testing by sending emails in rapid succession hits limit. No exponential backoff on retry. API client doesn't check rate limit headers before sending.

**How to avoid:**
- One email per day pattern: Sending daily digest is well under limits (86,400 seconds in a day)
- Exponential backoff: Catch 429 errors and retry with exponentially increasing delays (1s, 2s, 4s, 8s...)
- Rate limit awareness: Check response headers for remaining quota before critical sends
- Batch recipients: Use single email with multiple recipients (500 recipient limit) not multiple emails
- Avoid rapid testing: Use OAuth Playground or mock client for testing, not real Gmail API sends
- Monitor quota: Log daily quota usage to detect approaching limits

**Warning signs:**
- 429 errors in logs
- Emails send during testing but fail in production
- No retry logic in email sending code
- Test suite sends actual emails instead of mocking Gmail API

**Phase to address:**
Phase 5 (Email delivery) — Implement exponential backoff from the start. Test with real API quotas before considering done.

---

### Pitfall 9: Wikilink Auto-Linking False Positives

**What goes wrong:**
AI curation links "York" browsing history to `[[Duke of York]]` note about 15th century history when you were actually reading about New York tech scene. "America" links to continent page instead of United States. Generic terms like "Python" link to animal note instead of programming language. Users lose trust in auto-linking, turn it off.

**Why it happens:**
Entity disambiguation is hard. German alias "Amerika" for "United States" misleads English systems. Historical ambiguity: "Duke of York" has multiple referents across centuries. Common words have multiple meanings across domains. LLM auto-linking uses sparse context (just URL title) not full page content. No user feedback loop to learn disambiguation preferences.

**How to avoid:**
- Context-aware disambiguation: Include surrounding URL titles in disambiguation prompt, not just the single title
- Vault context: Prefer linking to frequently-modified notes (signals active interest) over stale notes
- Confidence thresholding: Only auto-link when model confidence >85%
- Explicit disambiguation: If multiple candidates, show `[[York|New York]]` syntax with explicit label
- Allowlist high-confidence terms: Auto-link technical terms in tech context (e.g., "React" → programming)
- Blocklist ambiguous terms: Never auto-link "America", "York", "Python" without disambiguation
- User override: Let user maintain personal disambiguation rules (York → always New York for me)
- Opt-in not opt-out: Make auto-linking opt-in per cluster, show preview before applying

**Warning signs:**
- Auto-links connect to notes the user hasn't opened in 6+ months
- Same term links to different notes across different days inconsistently
- Generic single-word terms get linked aggressively
- No way for user to override or train disambiguation

**Phase to address:**
Phase 3 (AI curation) — Design disambiguation logic with high precision (few false positives) over high recall (catching every linkable term).

---

### Pitfall 10: Browser History Export Format Breaking Changes

**What goes wrong:**
Extension update changes JSON export schema. Old curation scripts parse new schema incorrectly and fail silently. Browsing data from Day 1-30 has different schema than Day 31+ making historical analysis impossible. Database migration required but no migration path documented.

**Why it happens:**
Schema versioning not considered during initial implementation. Temptation to "just change the structure" during feature additions. No backwards compatibility testing. Export format is implementation detail, not documented contract. Chrome browser updates change History API response format and extension doesn't handle gracefully.

**How to avoid:**
- Schema versioning from day 1: Include `schema_version: 1` in every JSON export
- Strict versioning policy: Additive changes only (new fields OK, changing field types = new schema version)
- Migration library: Build schema migration functions for each version transition
- Backwards compatibility testing: Test current code against exports from all previous schema versions
- Forward compatibility: Older scripts ignore unknown fields (don't break on new fields)
- Explicit contracts: Document export schema with JSON Schema specification
- Version detection: Curation script checks schema_version and uses appropriate parser
- Fail loudly: Invalid schema version throws clear error with migration instructions, not silent data corruption

**Warning signs:**
- No version field in exported JSON
- Field names/types change between extension versions
- Export parsing code uses array indices not named fields (brittle to reordering)
- No tests for parsing exports from previous versions

**Phase to address:**
Phase 2 (Data export foundation) — Add schema versioning before first production use. Retrofitting versioning is near impossible.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skipping prompt caching | Faster to implement | 10x higher token costs at scale | Never — caching is 5 lines of code |
| Using `<all_urls>` permission | Access to all sites during dev | Rejection from Chrome Web Store, user distrust | Never — use specific domains or optional_permissions |
| Hardcoding "11 PM" in cron | Obvious and easy to read | Breaks on DST transitions, wrong time for non-local users | Only for personal use in single timezone |
| Appending to currently-open note | Simpler file handling logic | Race conditions, file corruption with Obsidian sync | Only if you verify Obsidian is closed before writing |
| No schema versioning | Faster initial development | Impossible to migrate data when schema changes | Only for throwaway prototypes |
| Sending all URLs to LLM | No need for pre-filtering logic | Costs spiral, slow processing, garbage-in clusters | Only during initial testing with <10 URLs/day |
| Using cron instead of launchd | Familiar syntax from Linux | Doesn't run if Mac asleep, permission issues on macOS Mojave+ | Never on macOS — use launchd |
| Storing state in service worker memory | Convenient global variables | State resets when service worker terminates (every 30s idle) | Never in MV3 — use chrome.storage |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Gmail API | Sending test emails in tight loop hits rate limit | Mock Gmail API in tests; use exponential backoff in production |
| Claude API (Anthropic) | Not using prompt caching for repeated context (vault wikilinks) | Cache static prompt sections with TTL=5min; reduces cost 90% |
| Chrome History API | Assuming history format never changes | Version exported JSON schemas; test parsing against real Chrome history DB |
| Obsidian vault writing | Appending to files while Obsidian has them open | Write-to-temp-then-atomic-rename pattern; check for file locks |
| iCloud/OneDrive sync | Writing to `.obsidian/workspace.json` causes constant conflicts | Never write to `.obsidian/` from automation; exclude workspace.json from sync |
| macOS launchd | Using cron syntax instead of plist | Use plist format with StartCalendarInterval; grant Full Disk Access permission |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Processing every URL individually | Works fine with 20 URLs/day | Batch URLs into single API call; use semantic deduplication | >100 URLs/day (30+ seconds processing time) |
| No deduplication before LLM | Clusters include obvious duplicates (same article on HN + Reddit) | Hash URL domains+titles; merge near-duplicates before clustering | >50 URLs/day (duplicate clusters confuse users) |
| Linear token growth with history | Small browsing = small tokens | Apply blocklist BEFORE LLM; set max input tokens; truncate old history | >200 URLs/day ($3+ per curation) |
| Synchronous file writes | Single daily note appends fast | Queue writes; batch into single atomic operation | >10 writes/minute (race conditions, corruption risk) |
| Full vault scan for wikilinks | 100 notes scans instantly | Cache wikilink index; only rescan changed files | >1000 notes in vault (5+ second scans) |
| No rate limiting on History API | Extension reads history once/day | Throttle reads to 1000 items/request with pagination | >10k history items (browser hangs) |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing browsing history in plaintext local files | Sensitive data exposed if machine compromised; leak in backups/sync | Encrypt local storage with user-controlled key; or process in-memory only |
| Sending full URLs to cloud LLM | URLs may contain auth tokens, session IDs, PII in query params | Strip query params before sending; allowlist safe domains only |
| No blocklist for sensitive sites | Captures banking URLs, medical portals, auth pages | Default blocklist: banking, medical, gmail.com, accounts.google.com, *.auth.* |
| Storing Gmail OAuth tokens insecurely | Token theft enables email access | Use OS keychain (Keychain Access on macOS) not plaintext files |
| Extension uses `tabs` permission unnecessarily | Enables reading content of all tabs, not just history | Request `history` only; avoid `tabs` unless you need active tab content |
| No data retention limits | Browsing history accumulates indefinitely | Auto-delete browsing data >90 days; make retention period configurable |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Permission prompt with no explanation | User sees scary "read browsing history" warning and denies | Show onboarding screen explaining why permission needed BEFORE Chrome prompt |
| AI-generated clusters with no edit UI | User can't correct hallucinated topic groupings | Inline edit: click cluster name to rename; drag URLs between clusters |
| Curation runs during active browsing | Performance impact, incomplete day snapshot | Schedule at fixed end-of-day time (11 PM) or trigger on vault daily note creation |
| No indication when curation fails | Silent failure = user thinks system is working but gets no digest | Desktop notification on curation completion; error notification on failure |
| Blocklist requires editing JSON file | Non-technical users can't customize | Settings UI in extension popup; import/export blocklist patterns |
| Email digest with no link back to vault | User reads digest but can't find full details | Include `obsidian://vault/second-brain/daily/2026-04-09` URIs in email |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Browser extension:** Often missing privacy policy URL in manifest — verify store listing shows privacy practices (required for Web Store approval)
- [ ] **Service worker implementation:** Often missing chrome.storage persistence — verify state survives 30-second idle timeout and service worker restart
- [ ] **File writing:** Often missing atomic write pattern — verify no corruption when Obsidian is actively editing the same file
- [ ] **Scheduling:** Often missing Full Disk Access permission — verify launchd job runs when triggered, check stderr logs in ~/Library/Logs/
- [ ] **Gmail integration:** Often missing exponential backoff — verify 429 rate limit errors trigger retry with increasing delays
- [ ] **AI clustering:** Often missing confidence thresholds — verify low-confidence clusters fall back to chronological list instead of hallucinated topics
- [ ] **Wikilink auto-linking:** Often missing disambiguation logic — verify ambiguous terms don't auto-link incorrectly
- [ ] **Token cost optimization:** Often missing prompt caching — verify cache hit rate >80% for vault wikilinks context
- [ ] **Schema versioning:** Often missing version field in exports — verify JSON includes `schema_version` and parser handles multiple versions
- [ ] **Blocklist:** Often missing sensitive domains — verify banking, medical, auth domains excluded by default

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Service worker context errors | LOW | Refactor background.js to use message passing not DOM access; test with service worker lifecycle |
| Vault file corruption | MEDIUM | Restore from git history or Obsidian sync; implement atomic write pattern; add pre-write file locking check |
| Chrome Web Store rejection | MEDIUM | Study rejection email; narrow permissions; add privacy policy; resubmit with detailed permission justification |
| Privacy backlash | HIGH | Add opt-in local processing mode; open-source extension code; publish third-party security audit |
| AI hallucination in clusters | LOW | Add edit UI for user corrections; log corrections to retrain prompts; add confidence thresholds |
| Token costs too high | LOW | Enable prompt caching (immediate 90% reduction); add blocklist pre-filtering; switch to Haiku model |
| Scheduling unreliability | LOW | Migrate cron to launchd; grant Full Disk Access; add logging to diagnose failures |
| Gmail rate limiting | LOW | Add exponential backoff; reduce send frequency; batch recipients into single email |
| Wikilink false positives | MEDIUM | Add disambiguation UI; build user override rules; increase confidence threshold |
| Schema breaking changes | HIGH | Write migration script for each version; test against all historical exports; document migration path |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Service worker context confusion | Phase 1 (Extension) | Service worker survives 30s idle timeout and restarts correctly |
| Vault corruption | Phase 2 (File writing) | Automation writes to file while Obsidian edits it — no corruption |
| Chrome Web Store rejection | Phase 1 (Extension) | Extension manifest passes policy review checklist before first submission |
| Privacy backlash | Phase 1 (Extension) | Install flow shows clear permission explanation; privacy policy published |
| AI hallucination | Phase 3 (AI curation) | Test clustering accuracy >85% on sample browsing data |
| Token costs spiral | Phase 3 (AI curation) | Curation costs <$0.30 per day with 100 URLs |
| Scheduling unreliability | Phase 4 (Scheduling) | Job runs after Mac sleep during trigger window; Full Disk Access granted |
| Gmail rate limiting | Phase 5 (Email delivery) | 429 errors trigger exponential backoff; test with rapid sends |
| Wikilink false positives | Phase 3 (AI curation) | Precision >90% on ambiguous terms; user can override disambiguation |
| Schema breaking changes | Phase 2 (Data export) | JSON includes schema_version; parser handles v1 and v2 |

## Sources

**Official Documentation (HIGH confidence):**
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Gmail API Quota Limits](https://developers.google.com/workspace/gmail/api/reference/quota)
- [Chrome Web Store Review Process](https://developer.chrome.com/docs/webstore/review-process)
- [Chrome Extension Permissions](https://developer.chrome.com/docs/extensions/reference/permissions-list)

**2026 Industry Research (MEDIUM-HIGH confidence):**
- [AI Hallucination Rates 2026](https://suprmind.ai/hub/ai-hallucination-rates-and-benchmarks/)
- [LLM Token Cost Optimization 2026](https://redis.io/blog/llm-token-optimization-speed-up-apps/)
- [Privacy Enforcement 2026](https://trustarc.com/resource/privacy-enforcement-surging-2026/)
- [Browser Extension Security 2026](https://www.island.io/browser-extension-security/browser-extension-security-defending-against-excessive-permissions)

**Community Knowledge (MEDIUM confidence):**
- [Obsidian Vault Sync Conflicts](https://www.ganesshkumar.com/articles/2026-02-04-clean-obsidian-vault/)
- [macOS launchd vs cron](https://blog.serghei.pl/posts/scheduling-recurring-tasks-on-macos-using-launchd/)
- [Entity Linking Survey 2026](https://www.mdpi.com/1099-4300/28/2/236)
- [Chrome Extension Rejection Reasons](https://www.extensionradar.com/blog/chrome-extension-rejected)

**Technical Deep Dives (MEDIUM confidence):**
- [Cross-browser Extension Compatibility](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Build_a_cross_browser_extension)
- [Data Deduplication Strategies](https://talent500.com/blog/data-deduplication-strategies-reducing-storage-and-improving-query-performance/)
- [DST Handling in Scheduled Jobs](https://inventivehq.com/blog/how-do-i-handle-time-zones-daylight-saving-time-cron)

---
*Pitfalls research for: Second Brain — Automated browsing capture + AI curation*
*Researched: 2026-04-09*
