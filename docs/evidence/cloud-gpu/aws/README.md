# AWS GPU lane - authorization status

## Status (Phase 12)

| Check | Result |
| --- | --- |
| Explicit authorization for billable AWS resources | **Not given** |
| AWS credentials available in this environment | **No** |
| Instance provisioned | **No** - no billable infrastructure was created |

## Proposed configuration (awaiting authorization)

- Region: `ca-central-1` (Canada Central)
- Instance: `g6.xlarge` - 1x NVIDIA L4, 24 GB GPU memory
- Estimated cost: approximately USD 0.90-1.10 per hour on-demand in `ca-central-1`;
  confirm the live rate before launch.
- Maximum run duration requested: 3 hours, with an automatic stop alarm
  (CloudWatch `StopInstances` on 30 minutes of low CPU) plus a hard termination at 3 h.
- Budget limit requested: USD 25 for the acceptance run.
- Browser environment: Amazon DCV with the official NVIDIA driver.
- Security groups: inbound restricted to the operator's own IP for DCV (TCP/UDP 8443)
  only. No public administrative ports, no open SSH to 0.0.0.0/0.
- Evidence storage: written back into `docs/evidence/cloud-gpu/aws/`.

The AWS lane runs the identical validation package as Brev (same candidate build,
geometry mode, viewport, DPR, quality, camera matrices, 35 s benchmark, A/B material
comparison, inspection views, lighting variants, thermal view and thresholds).
It runs only after the Brev lane passes.