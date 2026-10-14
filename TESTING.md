# Verification

`npm test` runs Node's built-in test runner against actual application modules and current canonical data. Tests cover destination-local schedules, multiline/overnight hours, unknown and planned states, composed filters, safe destinations, complete official directory parsing, coordinate-address conflicts, stable historical IDs, generated-data equality, cache boundaries, upgrades and CI safety.

`npm run build` validates all generated internal routes/assets. `npm audit --omit=dev` checks the production dependency tree.

Browser release checks: desktop and 390px phone layouts, tablet navigation, both themes, keyboard selection and focus return, mobile List/Map, compound filters, empty state, saved-place persistence/removal, deep links, explicit source conflicts, booking/directions URLs, correction prefill, map failure/retry and old service-worker migration. Use read-only or local test data; do not submit messages or book appointments during validation.

`docs/RELEASE_VERIFICATION.md` records the current release evidence and limits. The previous Jest tests used mock interfaces that did not exercise the application and were removed.
