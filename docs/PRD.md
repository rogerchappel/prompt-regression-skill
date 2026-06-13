# Product Requirements: prompt-regression-skill

## Goal

Give agents a deterministic preflight for prompt-output changes before a prompt PR or release handoff.

## Users

- Agent builders changing prompts.
- Maintainers reviewing prompt fixture updates.
- QA agents preparing regression summaries.

## MVP Requirements

- Read local JSON regression cases.
- Check required phrases, forbidden phrases, and simple tone hints.
- Produce text and JSON reports.
- Exit non-zero when deterministic checks fail.
- Include fixture-backed tests and smoke command.

## Non-Goals

- No live model evaluation.
- No prompt rewriting.
- No external review comments.

## Success Metrics

- The smoke fixture surfaces both passing and failing cases.
- Agents can add a case without changing code.
