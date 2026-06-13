# Orchestration

## Agent Flow

1. Verify cases are local and contain no secrets.
2. Run `npm run smoke` in this project.
3. Run `node bin/prompt-regression-skill.js <cases.json>`.
4. Inspect failures and distinguish real regressions from intentional fixture changes.
5. Include report status and failed case names in the PR handoff.

## Approval Boundaries

The skill may read local fixtures and print reports. It may not call model APIs, rewrite prompts, create pull request comments, or update trackers without explicit approval.

## Failure Modes

- Phrase checks can miss semantic regressions.
- Tone checks are simple hints and require review.
- Fixture outputs may contain stale expectations.
