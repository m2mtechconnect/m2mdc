# Connection workflow

Wizard steps (enabled only for connectors with a real runtime adapter): select connector; select
tenant/facility/environment; direction; authentication; network reachability test; schema or topic
discovery; data classes; source-to-entity mapping; unit and timestamp validation; safe sample
preview; subscription/polling configuration; permission review; activate; first-event verification.

Rules enforced: drafts are saved, cancellation is non-destructive, secrets are never re-displayed,
activation requires a passing server-side check, every blocker is explained in place, duplicate
instances per connector/facility/environment are rejected, validation is server-side, and each
transition writes an audit event.

Today only the three implemented connectors expose Test connection; every other catalogue entry
shows View requirements.
