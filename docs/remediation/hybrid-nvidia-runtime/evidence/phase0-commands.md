# Phase 0 raw command log
commit: 94f0d73bb24345be45898a2d08ef486a67fe6d15
captured: 2026-08-18T13:56Z UTC

$ bunx vitest run  -> exit 0 : 1840 passed / 91 skipped / 186 files (9 skipped)
$ bunx eslint .    -> 0 errors / 1347 warnings
$ ls supabase/functions | wc -l -> 167
$ ls supabase/migrations | wc -l -> 61
$ CREATE TABLE distinct names in migrations -> 134
$ find assets public src -name '*.usd*' -o -name '*.glb' | wc -l -> 15
$ assets/manifest.json -> 52 entries; approved=45 pending-source=3 pending-review=3 blocked=1; runtimeEligible true=43
$ rg -l 'Access-Control-Allow-Origin.*\*' supabase/functions | wc -l -> 91
$ rg -l 'createClient(.*SERVICE_ROLE' supabase/functions | wc -l -> 10
$ Math.random in src/simulation|twins|builder|dsx|workspace -> 96 lines / 17 files
