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
  const cases = Array.isArray(parsed) ? parsed : parsed.cases;
  if (!Array.isArray(cases)) {
    throw new Error("Regression file must be an array or an object with a cases array");
  }
  return cases.map(normalizeCase);
}

export function evaluateCases(cases) {
  const results = cases.map(evaluateCase);
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

function normalizeCase(item, index) {
  if (!item || typeof item !== "object") {
    throw new Error(`Case ${index + 1} must be an object`);
  }
  if (typeof item.output !== "string") {
    throw new Error(`Case ${item.name || index + 1} must include an output string`);
  }
  const expect = item.expect || {};
  return {
    name: item.name || `case-${index + 1}`,
    output: item.output,
    expect: {
      required: asStringArray(expect.required),
      forbidden: asStringArray(expect.forbidden),
      tone: expect.tone || null
    },
    notes: asStringArray(item.notes)
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
  return (toneHints[tone] || [tone]).some((hint) => normalized.includes(hint));
}

function asStringArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  return [String(value)];
}
