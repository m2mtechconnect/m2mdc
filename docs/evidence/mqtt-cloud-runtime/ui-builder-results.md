# UI and Builder acceptance

NOT RUN. The Connections runtime status, last event time, throughput and latency,
accepted/rejected counts, ingest history, mapping coverage, twin-property provenance,
Builder capability readiness, deployment blockers and audit history all read from
persisted runtime evidence. With zero ingest runs, zero messages and zero workers
persisted, there is nothing for these surfaces to report, and no surface was asserted
healthy on the basis of configuration alone.

No canary message was produced, so no value anywhere in the UI is labelled live,
measured, commissioned or operational.
