# Packaging Runbook

This project uses standard `npm` scripts over Electron Builder. The wrapper script in
`scripts/package-mac.cjs` is release hygiene: it keeps packaging bounded, makes unsigned
local builds explicit, and prevents packaging startup from depending on Electron Builder's
update-notifier registry check.

## Normal Local Release Flow

Run the checks first:

```bash
npm run typecheck
npm run build
npm run security:check
```

Then build the unsigned macOS artifacts you need:

```bash
npm run dist:mac:arm64:unsigned
npm run dist:mac:x64:unsigned
npm run dist:mac:universal:unsigned
```

Artifacts are written to ignored `release/` paths. Packaging never installs or replaces
`/Applications/ChatGPT Wrapper.app`; any installed app can be stale until manually replaced
from a generated artifact.

## Signed Builds

Signed and notarized builds use the non-`:unsigned` scripts when Apple credentials are set:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOURTEAMID"

npm run dist:mac:arm64
npm run dist:mac:x64
npm run dist:mac:universal
```

If those variables are missing, the notarization hook skips cleanly.

## Diagnostic Flow

Use the diagnostic script only when checking packaging health:

```bash
npm run package:diagnose
```

The diagnostic performs an unsigned arm64 directory package, avoids DMG/ZIP creation, and
exits `124` if Electron Builder exceeds the diagnostic timeout.

## Intentional Safeguards

- `NO_UPDATE_NOTIFIER=1` is set for the Electron Builder child process so packaging is
  deterministic in CI and local release runs. It is not a personal-network workaround.
- `package.json#build.npmRebuild = false` is intentional because the app has no runtime
  dependencies or native modules.
- Generated artifacts under `dist/` and `release/` stay out of Git.
- Do not weaken the Electron security model, copy browser cookies/tokens, add analytics,
  or replace the `BrowserWindow` shell with `<webview>` as a packaging workaround.

## If Packaging Hangs Again

Check operational state before changing app code:

1. Confirm network reachability to npm/Electron download hosts.
2. Re-run `npm run package:diagnose` and note whether it exits `124`.
3. Look for stale `electron-builder`, `npm`, or package wrapper processes.
4. Rehydrate dependencies with `npm ci` if `node_modules` may be stale.
5. Verify Electron Builder caches before changing package scripts or source behavior.
