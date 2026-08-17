# Phase 9 - data honesty

- Reference canary sampled on 17 routes with `?dataset=nvidia-dsx-reference`. Only 2 of those loads rendered a visible "NVIDIA DSX Reference" string in body text; 15 did not - a reader on those pages cannot tell that the data is reference and read-only. P1.
- The word "Read-only" was likewise not detected on most reference loads. P1.
- The production default remains legacy-synthetic and is not labelled as such anywhere in body text on the sampled routes. P2.
- Explicit unavailable/not-connected language ("No run recorded", "Not connected", "Unavailable") is present across most operational pages, which is honest and should be preserved.
- Not verified: export-label correspondence, reference facilities excluded from operational totals, SimReady vs OpenUSD-provenance wording at the point of decision, timestamp semantics - BLOCKED_UNVERIFIED.
