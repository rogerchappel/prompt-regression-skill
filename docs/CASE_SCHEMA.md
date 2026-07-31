# Case Schema

Regression files may be a JSON array or an object with a `cases` array. The
array must contain at least one case; an empty regression gate is invalid.

Required fields:

- `name`: non-empty stable case name.
- `output`: saved output to evaluate.

Optional fields:

- `expect`: an object when provided.
- `expect.required`: non-empty string or array of non-empty strings containing
  required phrases.
- `expect.forbidden`: non-empty string or array of non-empty strings containing
  forbidden phrases.
- `expect.tone`: a non-empty string such as `calm`, `direct`, `cautious`, or a
  custom hint.
- `notes`: string or array of strings that should travel with the report.

Values are validated rather than coerced. The loader and CLI reject malformed
containers, empty suites, missing required fields, empty or non-string phrase
values, and non-string tone or note values. Built-in tone hints match complete
tokens, so a hint such as `can` does not match the different word `cannot`.
CLI validation failures print a case- and field-specific diagnostic to stderr
and exit nonzero without producing a report.

Both supported containers below are equivalent:

```json
[
  {
    "name": "support-followup",
    "output": "Thanks for the context.",
    "expect": { "required": "context" }
  }
]
```

```json
{
  "cases": [
    {
      "name": "support-followup",
      "output": "Thanks for the context.",
      "expect": { "required": ["context"] }
    }
  ]
}
```
