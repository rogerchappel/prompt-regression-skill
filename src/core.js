import fs from "node:fs";
import path from "node:path";

export function loadCases(filePath) {
  const absolute = path.resolve(filePath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolute, "utf8"));
  } catch (error) {
    throw new Error(`Could not read regression cases: ${error.message}`);
  }
  const cases = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed.cases
      : undefined;
  if (!Array.isArray(cases)) {
    throw new Error("Regression file must be an array or an object with a cases array");
  }
  return normalizeCases(cases);
}

export function evaluateCases(cases) {
  const results = normalizeCases(cases).map(evaluateCase);
  const passed = results.filter((result) => result.status === "pass").length;
  const failed = results.length - passed;
  return {
    total: results.length,
    passed,
    failed,
    status: failed === 0 ? "pass" : "fail",
    riskLevel: failed === 0 ? "low" : failed === 1 ? "medium" : "high",
    results,
    recommendations: buildRecommendations(results)
  };
}

export function renderReport(report, format = "text") {
  if (format === "json") {
    return `${JSON.stringify(report, null, 2)}\n`;
  }
  const lines = [
    "# Prompt Regression Report",
    "",
    `Status: ${report.status}`,
    `Risk: ${report.riskLevel}`,
    `Cases: ${report.total}`,
    `Passed: ${report.passed}`,
    `Failed: ${report.failed}`,
    "",
    "## Results",
    ...report.results.flatMap((result) => [
      `- ${result.name}: ${result.status}`,
      ...result.findings.map((finding) => `  - ${finding}`)
    ]),
    "",
    "## Recommendations",
    ...report.recommendations.map((item) => `- ${item}`)
  ];
  return `${lines.join("\n")}\n`;
}

function normalizeCases(cases) {
  if (!Array.isArray(cases)) {
    throw new Error("Regression cases must be an array");
  }
  if (cases.length === 0) {
    throw new Error("Regression cases must contain at least one case");
  }
  return cases.map(normalizeCase);
}

function normalizeCase(item, index) {
  const label = `Case ${index + 1}`;
  if (!isPlainObject(item)) {
    throw new Error(`Case ${index + 1} must be an object`);
  }
  if (typeof item.name !== "string" || item.name.trim() === "") {
    throw new Error(`${label} field "name" must be a non-empty string`);
  }
  if (typeof item.output !== "string") {
    throw new Error(`${label} (${item.name}) field "output" must be a string`);
  }
  if (item.expect !== undefined && !isPlainObject(item.expect)) {
    throw new Error(`${label} (${item.name}) field "expect" must be an object`);
  }
  const expect = item.expect ?? {};
  const normalizedExpect = {
    required: asStringArray(expect.required, `${label} (${item.name}) field "expect.required"`),
    forbidden: asStringArray(expect.forbidden, `${label} (${item.name}) field "expect.forbidden"`)
  };
  const tone = optionalString(expect.tone, `${label} (${item.name}) field "expect.tone"`);
  if (tone !== undefined) normalizedExpect.tone = tone;

  return {
    name: item.name,
    output: item.output,
    expect: normalizedExpect,
    notes: asStringArray(item.notes, `${label} (${item.name}) field "notes"`)
  };
}

function evaluateCase(item) {
  const findings = [];
  for (const phrase of item.expect.required) {
    if (!containsNormalized(item.output, phrase)) {
      findings.push(`missing required phrase: ${phrase}`);
    }
  }
  for (const phrase of item.expect.forbidden) {
    if (containsNormalized(item.output, phrase)) {
      findings.push(`contains forbidden phrase: ${phrase}`);
    }
  }
  if (item.expect.tone && !matchesTone(item.output, item.expect.tone)) {
    findings.push(`tone check needs review: expected ${item.expect.tone}`);
  }
  if (item.notes.length) {
    findings.push(`review notes: ${item.notes.join("; ")}`);
  }
  return {
    name: item.name,
    status: findings.some((finding) => !finding.startsWith("review notes")) ? "fail" : "pass",
    findings: findings.length ? findings : ["all deterministic checks passed"]
  };
}

function buildRecommendations(results) {
  if (results.every((result) => result.status === "pass")) {
    return ["Attach the report to the prompt PR and request human review for subjective quality."];
  }
  return [
    "Fix missing required phrases or update the fixture if the expected behavior intentionally changed.",
    "Remove forbidden phrasing from outputs before shipping prompt changes.",
    "Ask for human review on tone findings and any case with reviewer notes."
  ];
}

function containsNormalized(text, phrase) {
  return normalize(text).includes(normalize(phrase));
}

function normalize(value) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function matchesTone(output, tone) {
  const normalized = normalize(output);
  const toneHints = {
    calm: ["thanks", "context", "can", "will", "concise"],
    direct: ["do", "run", "check", "because"],
    cautious: ["may", "verify", "review", "risk"]
  };
  const hints = toneHints[tone];
  if (!hints) return normalized.includes(normalize(tone));
  return hints.some((hint) => containsToken(normalized, hint));
}

function containsToken(text, token) {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, "u").test(text);
}

function asStringArray(value, field) {
  if (value === undefined) return [];
  const values = Array.isArray(value) ? value : [value];
  if (values.some((item) => typeof item !== "string")) {
    throw new Error(`${field} must be a string or an array of strings`);
  }
  if (values.some((item) => item.trim() === "")) {
    throw new Error(`${field} must contain non-empty strings`);
  }
  return values;
}

function optionalString(value, field) {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} must be a non-empty string`);
  }
  return value;
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
