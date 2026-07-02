# prompt-regression-skill

`prompt-regression-skill` is a local-first agent skill for checking prompt-output regressions from JSON fixture cases. It does not call a model. Instead, it evaluates saved outputs against required phrases, forbidden phrases, expected tone labels, reviewer notes, and aggregate risk so an agent can catch obvious breakage before a prompt PR.

## Quickstart

```bash
npm install
npm run smoke
node bin/prompt-regression-skill.js fixtures/cases.json --format json
node bin/prompt-regression-skill.js --help
node bin/prompt-regression-skill.js --version
```

## Case Format

```json
{
  "name": "support-followup",
  "output": "Thanks for the context. I will draft a concise follow-up.",
  "expect": {
    "required": ["concise follow-up"],
    "forbidden": ["guarantee"],
    "tone": "calm"
  }
}
```

## Safety Notes

The skill only reads local fixture files and prints a report. It does not execute prompts, call model APIs, mutate prompt files, or post review comments. Use it as a pre-review gate and pair it with human review for judgment-heavy changes.

## Verification

```bash
npm run check
npm test
npm run smoke
npm run demo:failures
npm run package:smoke
npm run install:smoke
npm run release:check
```

Use `npm run release:check` before publishing or opening a release PR.
`npm run package:smoke` verifies the dry-run tarball includes the executable
CLI, source module, fixtures, docs, policies, release notes, bin metadata, and
expected CLI output. `npm run install:smoke` installs the tarball in a
temporary project and runs the installed `prompt-regression-skill --help`
command.
