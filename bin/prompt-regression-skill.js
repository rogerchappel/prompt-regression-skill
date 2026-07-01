#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { evaluateCases, loadCases, renderReport } from "../src/core.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
  console.log("Usage: prompt-regression-skill <cases.json> [--format text|json]");
  process.exit(args.length === 0 ? 1 : 0);
}

if (args.includes("--version") || args.includes("-v")) {
  const packageJson = JSON.parse(
    readFileSync(new URL("../package.json", import.meta.url), "utf8")
  );
  console.log(packageJson.version);
  process.exit(0);
}

try {
  const filePath = args[0];
  const format = parseFormat(args.slice(1));
  const cases = loadCases(filePath);
  const report = evaluateCases(cases);
  process.stdout.write(renderReport(report, format));
  process.exitCode = report.status === "pass" ? 0 : 1;
} catch (error) {
  console.error(`prompt-regression-skill: ${error.message}`);
  process.exit(1);
}

function parseFormat(tokens) {
  let format = "text";
  for (let index = 0; index < tokens.length; index += 1) {
    if (tokens[index] !== "--format") throw new Error(`Unknown option: ${tokens[index]}`);
    format = tokens[++index];
  }
  if (!["text", "json"].includes(format)) throw new Error("--format must be text or json");
  return format;
}
