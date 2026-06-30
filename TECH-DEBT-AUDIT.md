# Technical Debt Audit

This repository is intentionally small: a macOS Electron `BrowserWindow` wrapper around the ChatGPT website with no OpenAI API usage, analytics, token copying, cookie copying, or `<webview>`.

## Addressed

- Added `npm run security:check` to make the open-source security posture testable. It fails on `<webview>`, custom cookie/token/storage handling, analytics-like dependencies, license drift, packaging output drift, or missing hardened window settings.
- Added `scripts/package-mac.cjs` and routed macOS package scripts through it so Electron Builder runs with a bounded timeout instead of hanging indefinitely.
- Disabled Electron Builder's update notifier in the packaging wrapper so CLI startup does not depend on npm registry reachability.
- Added `npm run package:diagnose`, an unsigned `--dir` package diagnostic that avoids DMG/ZIP creation and writes only to ignored `release/`.
- Documented that packaging output does not update `/Applications/ChatGPT Wrapper.app`; installed apps may be stale until replaced manually.
- Tightened package contents to runtime files, `LICENSE`, and `README.md`; generated artifacts remain ignored under `dist/` and `release/`.
- Disabled Electron Builder's native dependency rebuild for this dependency-free app so packaging does not wait on unnecessary `@electron/rebuild` work.
- Added a local macOS app icon so package output no longer falls back to Electron's default icon.
- Restored the normal TypeScript compiler build path (`tsc -p tsconfig.json`) and added `npm run typecheck`, removing the temporary transpile-only build script.
- Added `docs/packaging.md` to separate normal release flow, diagnostic-only flow, intentional safeguards, and troubleshooting steps.

## Remaining

- GUI validation was not performed here because the current work only changes source diagnostics, package scripts, and docs. Launch validation should be done before shipping a user-facing build.

## Stable Posture

- License: Unlicense.
- Runtime shell: Electron `BrowserWindow`, not `<webview>`.
- Session persistence: Electron `persist:chatgpt` partition.
- Token handling: no custom cookie, token, local storage, session storage, `Authorization`, or `Bearer` handling.
- Fallback auth path: Chrome app-mode menu item for Google/passkey flows.
