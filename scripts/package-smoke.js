import { spawnSync } from "node:child_process";

const requiredFiles = [
  "bin/prompt-regression-skill.js",
  "src/core.js",
  "fixtures/pass-cases.json",
  "fixtures/cases.json",
  "docs/CASE_SCHEMA.md",
  "docs/RELEASE_CANDIDATE.md",
  "examples/passing-report.json",
  "SKILL.md",
  "README.md",
  "LICENSE",
  "SECURITY.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md"
];

const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  encoding: "utf8"
});

if (result.error) throw result.error;

if (result.status !== 0) {
  process.stderr.write(result.stderr);
  process.exit(result.status ?? 1);
}

const [packument] = JSON.parse(result.stdout);
const packedFiles = new Set(packument.files.map((file) => file.path));
const missing = requiredFiles.filter((file) => !packedFiles.has(file));
const packedBin = packument.files.find((file) => file.path === "bin/prompt-regression-skill.js");

if (missing.length > 0) {
  console.error(`package smoke failed; missing files: ${missing.join(", ")}`);
  process.exit(1);
}

if (!packedBin || (packedBin.mode & 0o111) === 0) {
  console.error("package smoke failed; CLI bin is missing or not executable");
  process.exit(1);
}

const cliJson = spawnSync(process.execPath, ["bin/prompt-regression-skill.js", "fixtures/pass-cases.json", "--format", "json"], {
  encoding: "utf8"
});

if (cliJson.status !== 0) {
  process.stderr.write(cliJson.stderr);
  process.exit(cliJson.status ?? 1);
}

const report = JSON.parse(cliJson.stdout);
if (report.status !== "pass" || report.total !== 1) {
  console.error("package smoke failed; CLI JSON output did not match the passing fixture");
  process.exit(1);
}

console.log(`package smoke passed; checked ${requiredFiles.length} required files and CLI JSON output`);
