const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "src", "main.ts");
const outputDir = path.join(projectRoot, "dist");
const outputPath = path.join(outputDir, "main.js");

const source = fs.readFileSync(sourcePath, "utf8");
const result = ts.transpileModule(source, {
  fileName: sourcePath,
  reportDiagnostics: true,
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    esModuleInterop: true,
    strict: true,
    skipLibCheck: true,
    sourceMap: true
  }
});

const diagnostics = result.diagnostics ?? [];
const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);

if (errors.length > 0) {
  const host = {
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => projectRoot,
    getNewLine: () => "\n"
  };

  console.error(ts.formatDiagnosticsWithColorAndContext(errors, host));
  process.exit(1);
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, result.outputText);
fs.writeFileSync(`${outputPath}.map`, result.sourceMapText ?? "");

console.log(`Built ${path.relative(projectRoot, outputPath)}`);
process.exit(0);
