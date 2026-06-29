# ChatGPT Wrapper

Lightweight macOS ChatGPT web wrapper built with Electron and TypeScript.

## What It Does

- Loads ChatGPT in a hardened Electron `BrowserWindow`.
- Uses a dedicated persistent Electron partition, `persist:chatgpt`, so login can survive relaunches without copying cookies or tokens into custom files.
- Avoids Electron `<webview>`.
- Opens non-allowlisted external links in the system browser.
- Packages unsigned local macOS DMG/ZIP artifacts for Apple Silicon, Intel, and universal builds.

## Development

```bash
npm install
npm run build
npm start
```

## Packaging

Unsigned local builds:

```bash
npm run dist:mac:arm64:unsigned
npm run dist:mac:x64:unsigned
npm run dist:mac:universal:unsigned
```

Artifacts are written to `release/`, which is intentionally ignored by Git.

Signed/notarized builds can use the non-unsigned scripts after Apple credentials are available in the environment:

```bash
export APPLE_ID="your-apple-id@example.com"
export APPLE_APP_SPECIFIC_PASSWORD="xxxx-xxxx-xxxx-xxxx"
export APPLE_TEAM_ID="YOURTEAMID"

npm run dist:mac:arm64
npm run dist:mac:x64
npm run dist:mac:universal
```

When those credentials are absent, `build/notarize.cjs` skips notarization cleanly.
