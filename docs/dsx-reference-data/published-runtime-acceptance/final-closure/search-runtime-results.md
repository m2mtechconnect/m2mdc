# Search - published runtime

Verified: `/search` loads under the administrator reference session with its own
page identity, canary banner and 0 console errors; the legacy session renders
the original Search page. Query deep links, refresh behaviour, facility/dataset
context, empty-result and unauthorized states, and legacy-result leakage checks
were **not executed**: BLOCKED_UNVERIFIED.
