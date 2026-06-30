const { spawn } = require("node:child_process");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const builderBin = path.join(
  projectRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "electron-builder.cmd" : "electron-builder"
);

const args = process.argv.slice(2);

const readOption = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

const hasFlag = (name) => args.includes(name);
const arch = readOption("--arch");
const timeoutFromArg = readOption("--timeout-ms");
const timeoutMs = Number(timeoutFromArg || process.env.PACKAGE_TIMEOUT_MS || 10 * 60 * 1000);
let didTimeOut = false;

if (!["arm64", "x64", "universal"].includes(arch || "")) {
  console.error("Usage: node scripts/package-mac.cjs --arch <arm64|x64|universal> [--unsigned] [--dir] [--timeout-ms <ms>]");
  process.exit(1);
}

if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
  console.error("Package timeout must be a positive number of milliseconds.");
  process.exit(1);
}

const builderArgs = ["--mac"];

if (hasFlag("--dir")) {
  builderArgs.push("dir");
} else {
  builderArgs.push("dmg", "zip");
}

builderArgs.push(`--${arch}`);

if (hasFlag("--unsigned")) {
  builderArgs.push("--publish", "never");
}

const env = {
  ...process.env
};

if (hasFlag("--unsigned")) {
  env.CSC_IDENTITY_AUTO_DISCOVERY = "false";
}

console.log(`Running electron-builder ${builderArgs.join(" ")}`);
console.log(`Packaging timeout: ${timeoutMs}ms`);

const child = spawn(builderBin, builderArgs, {
  cwd: projectRoot,
  env,
  stdio: "inherit"
});

const timeout = setTimeout(() => {
  didTimeOut = true;
  console.error(`electron-builder did not finish within ${timeoutMs}ms; terminating.`);
  console.error("Generated output, if any, remains under release/ and is ignored by Git.");
  child.kill("SIGTERM");

  setTimeout(() => {
    if (child.exitCode === null) {
      child.kill("SIGKILL");
    }
  }, 5000).unref();
}, timeoutMs);

child.on("exit", (code, signal) => {
  clearTimeout(timeout);

  if (didTimeOut) {
    process.exit(124);
  }

  if (signal) {
    console.error(`electron-builder exited after signal ${signal}`);
    process.exit(1);
  }

  process.exit(code ?? 1);
});

child.on("error", (error) => {
  clearTimeout(timeout);
  console.error(`Failed to start electron-builder: ${error.message}`);
  process.exit(1);
});
