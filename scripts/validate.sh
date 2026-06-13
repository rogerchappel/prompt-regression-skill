#!/usr/bin/env bash
set -euo pipefail

npm run check
npm test
node bin/prompt-regression-skill.js fixtures/pass-cases.json --format text
node bin/prompt-regression-skill.js fixtures/cases.json --format text || test "$?" -eq 1
