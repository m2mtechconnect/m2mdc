# Connection workflow

Status: DESIGNED, NOT IMPLEMENTED. No setup wizard ships in this phase. All five connection
instances are provisioned server-side by migration; the catalogue renders a disabled
"Add connection" control with the reason "Setup wizard is not enabled yet: system connections are
provisioned server-side." Planned connectors render "View requirements" only.

Designed steps for the future wizard: select connector; select tenant/facility/environment;
direction; authentication; network reachability test; schema or topic discovery; data classes;
source-to-entity mapping; unit and timestamp validation; safe sample preview; subscription or
polling configuration; permission review; activate; first-event verification.

Rules the wizard must enforce when built: drafts saved, cancellation non-destructive, secrets never
re-displayed, activation only on a passing server-side check, every blocker explained in place,
duplicate instances rejected (a unique constraint on connector/facility/environment already
exists), server-side validation, and an audit event per transition.

Implemented today: the Test connection action, which invokes the server-side health check and
writes both a health-check row and an audit event.
