# Case Schema

Regression files may be a JSON array or an object with a `cases` array. The
array must contain at least one case; an empty regression gate is invalid.

Required fields:

- `name`: non-empty stable case name that is unique within the file.
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
values, non-string tone or note values, and duplicate names. The case schema is
closed: case objects support only `name`, `output`, `expect`, and `notes`, while
`expect` supports only `required`, `forbidden`, and `tone`. Unknown keys are
rejected with their case and field path so misspelled assertions cannot be
silently ignored. Tone matching is case-insensitive,
and both built-in and custom hints must match complete Unicode letter, number,
or underscore-delimited tokens. Thus `can` does not match `cannot`, and the
custom hint `formal` does not match `informally`; punctuation may delimit a
standalone match.
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
