# Release Candidate Notes

## Candidate

Initial public build of `prompt-regression-skill`.

## Verification

```bash
npm run check
npm test
npm run smoke
npm run demo:failures
npm run package:smoke
npm run release:check
```

`npm run demo:failures` intentionally exits non-zero because it demonstrates failing regression cases.

## Classification

ship

## Known Limitations

- No live model calls.
- Tone checks are heuristic.
- Diff summaries are planned but not in the MVP.
