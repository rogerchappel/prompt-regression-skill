import test from "node:test";
import assert from "node:assert/strict";
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

test("renders json and text reports", () => {
  const report = evaluateCases([
    {
      name: "ok",
      output: "Thanks, I will verify the context.",
      expect: { required: ["verify"], forbidden: ["guarantee"], tone: "calm" },
      notes: []
    }
  ]);
  assert.match(renderReport(report, "text"), /Prompt Regression Report/);
  assert.equal(JSON.parse(renderReport(report, "json")).status, "pass");
});
