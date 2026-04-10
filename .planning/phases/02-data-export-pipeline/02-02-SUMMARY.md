---
phase: 02-data-export-pipeline
plan: 02
subsystem: native-messaging-bridge
tags: [native-messaging, chrome-extension, data-export, ipc]
dependency_graph:
  requires:
    - 02-01 (shared schemas and types)
  provides:
    - native-messaging-host
    - extension-message-handler
    - host-manifest-installer
  affects:
    - extension-background-service
    - pipeline-cli
tech_stack:
  added:
    - chrome-native-messaging (stdin/stdout protocol library)
  patterns:
    - length-prefixed JSON messaging
    - stderr-only logging for native hosts
    - Chrome/Comet manifest generation
    - 7-day rolling retention window
key_files:
  created:
    - pipeline/src/messaging/protocol.ts
    - pipeline/src/messaging/host.ts
    - pipeline/bin/native-host.js
    - pipeline/manifests/chrome-manifest.json
    - pipeline/manifests/install-host.sh
    - pipeline/tests/messaging/protocol.test.ts
  modified:
    - extension/entrypoints/background.ts
    - extension/wxt.config.ts
    - extension/package.json
    - pipeline/package.json
decisions:
  - title: "Manual message framing instead of stream transforms"
    context: "chrome-native-messaging provides both stream-based and manual read/write APIs"
    choice: "Used manual readMessage/writeMessage functions for simpler request-response pattern"
    rationale: "Native host handles one message, responds, and exits — no need for persistent streams. Simpler code, easier to test."
  - title: "All logging to stderr, never stdout"
    context: "Native messaging protocol uses stdout for length-prefixed JSON messages"
    choice: "Strict console.error() only policy in host code, documented in comments"
    rationale: "console.log() would corrupt the protocol stream. stderr is the only safe channel for debug output."
  - title: "Extension returns ALL captures before cleanup"
    context: "D-03 requires 7-day retention, but export happens before cleanup"
    choice: "handleGetCaptures returns full captures object, THEN cleans storage"
    rationale: "Pipeline receives all data (including about-to-be-deleted entries) so nothing is lost. Cleanup happens after export."
  - title: "Install script supports both Chrome and Comet"
    context: "User runs both Chrome and Comet browsers"
    choice: "install-host.sh detects Comet directory and installs manifest to both NativeMessagingHosts locations"
    rationale: "Single install command configures both browsers. Comet install is conditional (only if directory exists)."
  - title: "Manifest uses runtime placeholders, not config file"
    context: "Manifest needs absolute path and extension ID"
    choice: "Template manifest has PLACEHOLDER values; install script generates actual manifest at install time"
    rationale: "Extension ID is user-specific (changes per Chrome profile), host path is absolute. Can't commit actual values to repo."
metrics:
  duration: 184s
  tasks_completed: 2
  files_created: 6
  files_modified: 4
  tests_added: 5
  commits: 2
  completed_at: "2026-04-10T21:17:35Z"
---

# Phase 02 Plan 02: Native Messaging Bridge Summary

**One-liner:** Chrome native messaging host with stdin/stdout protocol, extension message handler, and 7-day rolling retention cleanup (D-03)

## What Was Built

Built the Chrome Native Messaging bridge that allows the CLI to request capture data from the browser extension. This is the data transport layer — the mechanism by which captured browsing data moves from the extension's chrome.storage into the local filesystem where the pipeline can process it.

**Core components:**

1. **Native messaging host** (`pipeline/src/messaging/host.ts`)
   - Handles `getCaptures` action (receives captures, returns success confirmation)
   - Handles `ping` action (health check)
   - All logging to stderr (never stdout — protocol requirement)

2. **Protocol utilities** (`pipeline/src/messaging/protocol.ts`)
   - `readMessage()` — reads length-prefixed JSON from stdin
   - `writeMessage()` — writes length-prefixed JSON to stdout
   - Uses Buffer.readUInt32LE/writeUInt32LE for 4-byte length header

3. **Executable entry point** (`pipeline/bin/native-host.js`)
   - Shebang script that launches host.runHost()
   - Executable permission set (chmod +x)

4. **Host manifest and installer** (`pipeline/manifests/`)
   - Template manifest with PLACEHOLDER_ABSOLUTE_PATH and PLACEHOLDER_EXTENSION_ID
   - install-host.sh generates actual manifest with resolved paths
   - Installs to Chrome and Comet NativeMessagingHosts directories

5. **Extension message handler** (`extension/entrypoints/background.ts`)
   - `runtime.onMessage` listener for `getCaptures` action
   - `handleGetCaptures()` returns all captures from chrome.storage
   - **D-03 implementation:** Cleans captures older than 7 days after export
   - Stores `lastExportTimestamp` for future retention tracking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Missing jsdom dependency**
- **Found during:** Task 2 test run
- **Issue:** jsdom was declared in package.json devDependencies but not actually installed in node_modules, causing test failure
- **Fix:** Ran `npm install jsdom --save-dev --workspace=extension` to install missing dependency
- **Files modified:** extension/package-lock.json
- **Commit:** 8886926 (included in Task 2 commit)

No other deviations — plan executed as written.

## Tests

**Pipeline tests:** 17 passing (5 new native messaging protocol tests)
**Extension tests:** 75 passing (no regressions)

**New test coverage:**
- handleMessage with getCaptures (single day, multiple days, empty)
- handleMessage with ping
- handleMessage with unknown action (error case)

## Verification

- ✅ `npm test --workspace=pipeline` passes (17 tests)
- ✅ `npm test --workspace=extension` passes (75 tests)
- ✅ `npm run build --workspace=extension` succeeds
- ✅ Extension manifest includes `nativeMessaging` permission
- ✅ `pipeline/bin/native-host.js` is executable
- ✅ `pipeline/manifests/install-host.sh` is executable
- ✅ No `console.log()` calls in native host code (only `console.error()`)

## Threat Mitigations Implemented

- **T-02-04 (Spoofing):** `allowed_origins` in manifest restricts communication to specific extension ID only
- **T-02-05 (Tampering):** `handleMessage` validates action field before processing, returns error for unknown actions
- **T-02-06 (Information Disclosure):** All debug logging to stderr, never stdout — prevents data leakage into protocol stream

**T-02-07 (Tampering) and T-02-08 (DoS):** Both marked "accept" in threat model — no mitigations needed.

## Known Issues

None.

## Next Steps

**Immediate next plan (02-03):** CLI command to trigger export via native messaging host

**Integration points:**
- CLI will launch `pipeline/bin/native-host.js` using Chrome's connectNative API
- Extension's `handleGetCaptures` will be invoked when CLI sends `getCaptures` message
- Host returns captures to CLI for database storage

**User action required before testing:**
1. Build extension: `npm run build --workspace=extension`
2. Load unpacked extension from `extension/.output/chrome-mv3/` in chrome://extensions
3. Copy extension ID from chrome://extensions (with Developer Mode enabled)
4. Run `pipeline/manifests/install-host.sh <extension-id>` to install native messaging host
5. Restart Chrome/Comet for manifest to take effect

## Self-Check

✅ **Files created exist:**
```
FOUND: pipeline/src/messaging/protocol.ts
FOUND: pipeline/src/messaging/host.ts
FOUND: pipeline/bin/native-host.js
FOUND: pipeline/manifests/chrome-manifest.json
FOUND: pipeline/manifests/install-host.sh
FOUND: pipeline/tests/messaging/protocol.test.ts
```

✅ **Commits exist:**
```
FOUND: 8a16d83 (Task 1: Native messaging host)
FOUND: 8886926 (Task 2: Extension message handler)
```

✅ **Files modified exist:**
```
FOUND: extension/entrypoints/background.ts
FOUND: extension/wxt.config.ts
```

## Self-Check: PASSED

All claimed files and commits verified present.
