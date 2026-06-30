const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(projectRoot, "src", "main.ts"), "utf8");
const packageJson = JSON.parse(fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"));

const failures = [];

const requirePattern = (label, pattern, minimum = 1) => {
  const matches = source.match(pattern) || [];
  if (matches.length < minimum) {
    failures.push(`${label}: expected at least ${minimum} match(es), found ${matches.length}`);
  }
};

const forbidPattern = (label, pattern) => {
  if (pattern.test(source)) {
    failures.push(label);
  }
};

forbidPattern("Forbidden <webview> or enabled webviewTag found", /<webview\b|webviewTag\s*:\s*true/);
forbidPattern(
  "Forbidden custom cookie/token/storage handling found",
  /\b(setCookie|getCookie|getAllCookies|Authorization|Bearer|localStorage|sessionStorage)\b|session\.fromPartition|cookies?\./
);
forbidPattern("Analytics dependency or implementation reference found", /\banalytics\b|telemetry|tracking/i);

requirePattern("Persistent ChatGPT partition", /SESSION_PARTITION\s*=\s*"persist:chatgpt"/);
requirePattern("BrowserWindow webview disabled", /webviewTag\s*:\s*false/g, 2);
requirePattern("BrowserWindow sandbox enabled", /sandbox\s*:\s*true/g, 2);
requirePattern("BrowserWindow context isolation enabled", /contextIsolation\s*:\s*true/g, 2);
requirePattern("BrowserWindow node integration disabled", /nodeIntegration\s*:\s*false/g, 2);
requirePattern("External link guard", /openInExternalBrowser/g, 2);
requirePattern("Chrome app-mode passkey fallback", /openInChromeAppMode/g);

if (packageJson.license !== "Unlicense") {
  failures.push(`Expected package license to be Unlicense, found ${packageJson.license || "<missing>"}`);
}

if (packageJson.main !== "dist/main.js") {
  failures.push(`Expected package main to be dist/main.js, found ${packageJson.main || "<missing>"}`);
}

if (packageJson.build?.directories?.output !== "release") {
  failures.push("Expected electron-builder output directory to be release/");
}

const dependencyNames = Object.keys({
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {})
});

const analyticsDependency = dependencyNames.find((name) => /analytics|telemetry|tracking/i.test(name));
if (analyticsDependency) {
  failures.push(`Analytics-like dependency found: ${analyticsDependency}`);
}

if (failures.length > 0) {
  console.error("Security posture check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Security posture check passed.");
