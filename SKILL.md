# Prompt Regression Skill

## When To Use

Use this skill when an agent is reviewing prompt edits, prompt library changes, or saved model-output examples and needs a deterministic preflight before asking for human review.

## Required Inputs

- A JSON file containing regression cases.
- Each case should include `name`, `output`, and optional `expect.required`, `expect.forbidden`, `expect.tone`, and `notes`.

## Tools

- Local filesystem read access.
- Node.js 20 or newer.
- No model API or network access is required.

## Side-Effect Boundaries

This skill is read-only. It must not call model APIs, rewrite prompts, edit fixtures, create PR comments, or update issue trackers without explicit approval.

## Workflow

1. Run `npm run smoke` to verify the bundled fixture.
2. Add or update local regression cases in the target project.
3. Run `node bin/prompt-regression-skill.js <cases.json>`.
4. Review failed cases and risk notes.
5. Include the report summary in the prompt PR or handoff.

## Validation

Run:

```bash
npm run check
npm test
npm run smoke
```
