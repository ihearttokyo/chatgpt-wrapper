# ChatGPT Wrapper - Security Audit Checklist

Scope: `chatgpt-wrapper` implementation currently in `src/main.ts` and packaging metadata in
`package.json`/`tsconfig.json`.

## Current findings (direct review)

| Control | Evidence | Result |
| --- | --- | --- |
| No `<webview>` usage | `src/main.ts` contains no `<webview>` tags and no `webviewTag`-enabled logic. | PASS |
| Dedicated persistent session partition | `SESSION_PARTITION = "persist:chatgpt"` in `src/main.ts` and `partition: SESSION_PARTITION` in both main/auth windows. | PASS |
| No cookie/token copy logic | No `cookies/getCookie/setCookie/session.fromPartition/Authorization/token` patterns in `src/main.ts`. | PASS (no hits) |
| Hardened `webPreferences` | `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`, `webSecurity: true`, `webviewTag: false`, `allowRunningInsecureContent: false`, and packaged `devTools: false` are set on both windows. | PASS |
| Safe link handling | `setWindowOpenHandler`, `will-navigate`, `will-redirect`, and guarded `shell.openExternal` calls are wired to an allowlist check. | PASS |
| Google/passkey fallback | Electron user-agent token is stripped before page loads, and the app menu includes a Chrome app-mode fallback for passkey flows that require the user's real browser profile. | PASS |
| Package artifact path hygiene | `package.json#main = "dist/main.js"` and `tsconfig.json#outDir = "dist"` are aligned. `build.files` packages runtime files only, and generated package output goes to ignored `release/`. | PASS |
| Packaging diagnostics | `npm run package:diagnose` runs an unsigned macOS directory package with a timeout, disables Electron Builder's update notifier, and writes only to ignored `release/`. | PASS |
| Native dependency rebuild | `package.json#build.npmRebuild = false` because the app has no runtime dependencies or native modules. | PASS |

## Suggested remediations (prioritized)

1. Keep the `persist:chatgpt` partition: this is intentional so login survives relaunches without custom cookie/token storage.
2. Keep the explicit URL guard before `openExternal`:
   - verify protocol before opening, and never pass malformed/empty URLs.
3. Keep explicit hardening flags:
   - set `webviewTag: false` and `allowRunningInsecureContent: false` in both windows.
4. Use the separate `createAuthWindow` only for allowlisted popup/login targets, sharing the same persistent partition.
5. For Google passkey loops, use the Chrome app-mode fallback rather than weakening Electron sandboxing or copying browser cookies.

## Quick automated checks (copy/paste)

```bash
set -euo pipefail

echo "==> webview / partition"
rg -n "persist:chatgpt|partition: SESSION_PARTITION|webviewTag\\s*:\\s*false" src/main.ts
! rg -n "<webview\\b|webviewTag\\s*:\\s*true" src/main.ts

echo "==> cookie/token patterns"
rg -n "cookie|cookies|setCookie|getAllCookies|getCookie|session\\.fromPartition|Authorization|Bearer|localStorage|sessionStorage|token" src/main.ts

echo "==> scripted posture check"
npm run security:check

echo "==> webPreferences"
rg -n "webPreferences\\s*:\\s*\\{|nodeIntegration\\s*:\\s*false|contextIsolation\\s*:\\s*true|sandbox\\s*:\\s*true|webSecurity\\s*:\\s*true|webviewTag\\s*:\\s*false|allowRunningInsecureContent\\s*:\\s*false" src/main.ts

echo "==> navigation safety"
rg -n "setWindowOpenHandler|will-navigate|will-redirect|shell\\.openExternal" src/main.ts

echo "==> artifact path contract"
node -e "const p=require('./package.json'); console.log('main=',p.main); if (p.main!=='dist/main.js') process.exit(1);"
node -e "const ts=require('./tsconfig.json'); console.log('outDir=',ts.compilerOptions?.outDir); if(ts.compilerOptions?.outDir!=='dist') process.exit(1);"
test -f dist/main.js && echo \"dist/main.js present\" || echo \"dist/main.js missing (run npm run build)\"
```

## Packaging diagnostics

```bash
npm run package:diagnose
```

This builds the TypeScript entrypoint, asks Electron Builder for an unsigned arm64 directory package, and terminates with exit code `124` if the local packaging process does not complete within the diagnostic timeout. It sets `NO_UPDATE_NOTIFIER=1` for the Electron Builder child process so the diagnostic does not depend on an npm registry check. It does not install or update `/Applications/ChatGPT Wrapper.app`; compare that installed app separately if you need to confirm it is not stale.

## GUI validation playbook

- Start the app and verify the initial load targets `chat.openai.com` and renders in one main window.
- Click links:
  - allowed domain: should remain inside app context,
  - non-allowlisted domains: should open in external browser, not an Electron BrowserWindow.
- Trigger popup/link behavior (`window.open`, auth redirects, SSO flows) and ensure no unexpected extra windows are spawned unless intended by policy.
- Verify global shortcut `CommandOrControl+Shift+G` only toggles visibility of main window.
- Resize windows, toggle menu commands, and run through login/logout/refresh to confirm no stale modal/blank-state regressions.
