# AWS publication architecture for AURA hybrid OpenUSD assets

AWS is the production infrastructure target. It does not replace NVIDIA
Omniverse DSX, OpenUSD or the Brev conversion environment.

## Responsibilities

| Concern | AWS service | Path / configuration |
|---|---|---|
| Versioned USD masters and dependencies | S3 (private, versioning + object lock) | `s3://aura-usd-source/<assetKey>/v<N>/source/` |
| Approved browser derivatives | S3 (private origin) | `s3://aura-usd-derivatives/<assetKey>/v<N>/web/<file>.glb` |
| Browser delivery | CloudFront with Origin Access Control | `https://assets.<domain>/a/v1/<assetKey>/v<N>/<file>.glb` |
| Validation evidence | S3 (versioned, immutable) | `s3://aura-asset-evidence/<runId>/` |
| Optional high-fidelity GPU services | EC2 G5/G6 | rendering and Omniverse Kit services only, never asset authority |
| Region | `ca-central-1` | Canadian residency where sovereignty requirements apply |

## Security requirements

- Source USD objects are private. No bucket policy grants `s3:GetObject` to `*`.
- Browser users receive only approved derivatives, through CloudFront + OAC.
- Source assets and approval evidence require admin/owner IAM principals.
- Signed URLs (CloudFront key groups) expire within 15 minutes and renew server-side.
- CORS on the derivative distribution allows only the AURA application origins
  (`https://auradc.m2mtechconnect.com`, `https://m2mdc.lovable.app`, preview host)
  with `GET, HEAD` and no wildcard.
- GLB objects are published with `Content-Type: model/gltf-binary`.
- The published bytes are re-downloaded and checksummed before the manifest entry
  is approved; a mismatch fails the publication.
- No credentials in the browser bundle or in the repository. Publication assumes
  an IAM role via OIDC from CI.

## Human deployment steps

1. Create the three buckets in `ca-central-1` with versioning enabled and public access blocked.
2. Create the CloudFront distribution over the derivative bucket with OAC, the CORS response headers policy above, and a key group for signed URLs.
3. Create the CI OIDC role with `s3:PutObject` on source/derivative/evidence prefixes and no delete on evidence.
4. Set `AWS_REGION`, `AURA_S3_SOURCE_BUCKET`, `AURA_S3_DERIVATIVE_BUCKET`, `AURA_S3_EVIDENCE_BUCKET`, `AWS_ROLE_ARN`, `AURA_CDN_BASE_URL`.
5. Run the Brev pipeline commands, then publish and re-checksum.
6. Point `glbUrl` in `assets/manifest.json` at `AURA_CDN_BASE_URL` paths and re-run the registry tests.

## Status

`publication-blocked`: no AWS credentials or infrastructure authority are
available from this environment. Nothing is published to AWS and no publication
is claimed. The currently working derivatives continue to be served from the
existing Lovable asset CDN and are untouched by this preparation.
