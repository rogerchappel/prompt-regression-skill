import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { evaluateCases, loadCases, renderReport } from "../src/core.js";

test("loads fixture cases", () => {
  const cases = loadCases("fixtures/cases.json");
  assert.equal(cases.length, 3);
  assert.equal(cases[0].name, "followup-draft");
});

test("evaluates pass and fail cases", () => {
  const report = evaluateCases(loadCases("fixtures/cases.json"));
  assert.equal(report.total, 3);
  assert.equal(report.passed, 1);
  assert.equal(report.failed, 2);
  assert.equal(report.status, "fail");
  assert.equal(report.riskLevel, "high");
});

test("evaluates loaded cases when every optional field is omitted", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-optional-"));
  const file = path.join(directory, "minimal.json");
  writeFileSync(file, JSON.stringify([{ name: "minimal", output: "hello" }]));

  try {
    const report = evaluateCases(loadCases(file));
    assert.equal(report.status, "pass");
    assert.deepEqual(report.results[0].findings, ["all deterministic checks passed"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("loads array and object case containers", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-cases-"));
  const caseItem = { name: "valid", output: "hello" };

  try {
    for (const [name, contents] of [
      ["array.json", [caseItem]],
      ["object.json", { cases: [caseItem] }]
    ]) {
      const file = path.join(directory, name);
      writeFileSync(file, JSON.stringify(contents));
      assert.equal(loadCases(file)[0].name, "valid");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects empty suites through file and evaluation APIs", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-empty-"));
  const file = path.join(directory, "empty.json");
  writeFileSync(file, '{"cases":[]}');

  try {
    assert.throws(() => loadCases(file), /must contain at least one case/);
    assert.throws(() => evaluateCases([]), /must contain at least one case/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects malformed case fields with case-specific diagnostics", () => {
  const valid = { name: "valid", output: "hello" };
  const invalidCases = [
    [{ output: "hello" }, /Case 1 field "name"/],
    [{ name: "bad-output", output: 42 }, /Case 1 \(bad-output\) field "output"/],
    [{ ...valid, expect: [] }, /Case 1 \(valid\) field "expect"/],
    [{ ...valid, expect: { required: { phrase: "hello" } } }, /field "expect.required".*string or an array of strings/],
    [{ ...valid, expect: { required: [""] } }, /field "expect.required".*non-empty strings/],
    [{ ...valid, expect: { required: ["  "] } }, /field "expect.required".*non-empty strings/],
    [{ ...valid, expect: { forbidden: ["fine", 42] } }, /field "expect.forbidden".*string or an array of strings/],
    [{ ...valid, expect: { forbidden: ["fine", "\t"] } }, /field "expect.forbidden".*non-empty strings/],
    [{ ...valid, expect: { tone: false } }, /field "expect.tone".*non-empty string/],
    [{ ...valid, notes: ["fine", {}] }, /field "notes".*string or an array of strings/]
  ];

  for (const [item, diagnostic] of invalidCases) {
    assert.throws(() => evaluateCases([item]), diagnostic);
  }
});

test("rejects unsupported case and expectation keys through both APIs", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-unknown-"));
  const cases = [
    { name: "case-key", output: "hello", outputs: "ignored" },
    { name: "expect-key", output: "hello", expect: { requried: "missing" } }
  ];

  try {
    for (const [index, diagnostic] of [[0, /Case 1 \(case-key\).*unsupported field "outputs"/], [1, /Case 1 \(expect-key\).*unsupported field "expect.requried"/]]) {
      assert.throws(() => evaluateCases([cases[index]]), diagnostic);
      const file = path.join(directory, `unknown-${index}.json`);
      writeFileSync(file, JSON.stringify([cases[index]]));
      assert.throws(() => loadCases(file), diagnostic);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects duplicate case names through both APIs", () => {
  const cases = [
    { name: "same", output: "first" },
    { name: "same", output: "second" }
  ];
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-duplicate-"));
  const file = path.join(directory, "duplicate.json");
  writeFileSync(file, JSON.stringify(cases));

  try {
    assert.throws(() => evaluateCases(cases), /Case 2 \(same\).*duplicates Case 1/);
    assert.throws(() => loadCases(file), /Case 2 \(same\).*duplicates Case 1/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("matches built-in tone hints only at token boundaries", () => {
  const report = evaluateCases([
    { name: "substring", output: "This cannot be approved.", expect: { tone: "calm" } },
    { name: "token", output: "We can review this.", expect: { tone: "calm" } }
  ]);

  assert.equal(report.results[0].status, "fail");
  assert.equal(report.results[1].status, "pass");
});

test("matches custom tone hints only at Unicode token boundaries", () => {
  const report = evaluateCases([
    { name: "substring", output: "We will respond informally.", expect: { tone: "formal" } },
    { name: "standalone", output: "The requested style is FORMAL, concise.", expect: { tone: "formal" } }
  ]);

  assert.equal(report.results[0].status, "fail");
  assert.deepEqual(report.results[0].findings, ["tone check needs review: expected formal"]);
  assert.equal(report.results[1].status, "pass");
});

test("renders json and text reports", () => {
  const report = evaluateCases([
    {
      name: "ok",
      output: "Thanks, I will verify the context.",
      expect: { required: ["verify"], forbidden: ["guarantee"], tone: "calm" },
      notes: []
    }
  ]);
  assert.match(renderReport(report, "text"), /Risk: low/);
  assert.equal(JSON.parse(renderReport(report, "json")).status, "pass");
});

test("CLI prints package version", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const result = spawnSync(process.execPath, ["bin/prompt-regression-skill.js", "--version"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), pkg.version);
});

test("CLI rejects an empty suite with a diagnostic and nonzero exit", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-cli-"));
  const file = path.join(directory, "empty.json");
  writeFileSync(file, "[]");

  try {
    const result = spawnSync(process.execPath, ["bin/prompt-regression-skill.js", file, "--format", "json"], {
      encoding: "utf8"
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /must contain at least one case/);
    assert.equal(result.stdout, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI rejects unsupported keys and duplicate names without stdout", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-cli-schema-"));
  const fixtures = [
    ["unknown.json", [{ name: "typo", output: "ok", expect: { requried: "must exist" } }], /unsupported field "expect.requried"/],
    ["duplicate.json", [{ name: "same", output: "one" }, { name: "same", output: "two" }], /duplicates Case 1/]
  ];

  try {
    for (const [name, contents, diagnostic] of fixtures) {
      const file = path.join(directory, name);
      writeFileSync(file, JSON.stringify(contents));
      const result = spawnSync(process.execPath, ["bin/prompt-regression-skill.js", file, "--format", "json"], { encoding: "utf8" });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, diagnostic);
      assert.equal(result.stdout, "");
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI evaluates a minimal case without optional fields", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-cli-minimal-"));
  const file = path.join(directory, "minimal.json");
  writeFileSync(file, JSON.stringify([{ name: "minimal", output: "hello" }]));

  try {
    const result = spawnSync(process.execPath, ["bin/prompt-regression-skill.js", file, "--format", "json"], {
      encoding: "utf8"
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).status, "pass");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("CLI fails when a custom tone occurs only inside a larger token", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "prompt-regression-cli-tone-"));
  const file = path.join(directory, "custom-tone.json");
  writeFileSync(file, JSON.stringify([
    { name: "substring", output: "We will respond informally.", expect: { tone: "formal" } },
    { name: "standalone", output: "A FORMAL response follows!", expect: { tone: "formal" } }
  ]));

  try {
    const result = spawnSync(process.execPath, ["bin/prompt-regression-skill.js", file, "--format", "json"], {
      encoding: "utf8"
    });
    const report = JSON.parse(result.stdout);
    assert.notEqual(result.status, 0);
    assert.equal(report.status, "fail");
    assert.equal(report.results[0].status, "fail");
    assert.equal(report.results[1].status, "pass");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
