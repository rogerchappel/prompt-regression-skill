# Case Schema

Regression files may be a JSON array or an object with a `cases` array.

Required fields:

- `name`: stable case name.
- `output`: saved output to evaluate.

Optional fields:

- `expect.required`: string or array of required phrases.
- `expect.forbidden`: string or array of forbidden phrases.
- `expect.tone`: one of `calm`, `direct`, `cautious`, or a custom hint.
- `notes`: reviewer notes that should travel with the report.
