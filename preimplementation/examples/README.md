# Illustrative records and rejection fixtures

All records in this directory are fictional examples of the proposed TriX 0.2 companion contracts. Dates, identities, reference strings, resources and versions do not identify a measured or qualified deployment. The task request is a single admission envelope, not a runnable program or complete TriX plan.

`expected-outcomes.json` lists every JSON example and fixture with its schema, expected validity and, for a negative case, the required rejection code. There are four primary valid examples and twelve targeted fixtures: one additional valid cancellation disposition and eleven intentional rejections. The invalid directory contains deliberately malformed JSON as well as structurally or semantically invalid records; it must not be treated as a directory of executable requests.

The primary task-record example demonstrates reconciliation with stale execution knowledge and an unresolved effect. The additional valid cancellation fixture demonstrates the explicit RUN-004 alternative that blocks further managed effects while keeping ongoing execution and cost visible. Previously applied effects remain recorded. The valid test-evidence example records `not-run`; it is not a fictional successful test.

Run `python tools/validate_package.py` from the package root after making the pinned dependency available. The validator compares real observed outcomes with this index. Its checks and limitations are documented in `schemas/README.md`. Changing an expected result to hide a defect is not a valid correction.
