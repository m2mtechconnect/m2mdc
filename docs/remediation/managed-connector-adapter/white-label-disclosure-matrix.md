# White-label disclosure matrix

RESTRICTED ENGINEERING DOCUMENT. Not bundled into client code and not linked from the
customer UI.

AURA is the customer-facing product. The managed connector gateway, managed OAuth
applications and hosted backend functions are supplied by the underlying build platform
(Lovable). AURA does not claim to have built or to own that infrastructure, and complete
infrastructure-level white-labelling is NOT claimed.

| Surface | Provider visible to a technical user? | Mitigation |
| --- | --- | --- |
| Customer UI strings, badges, wizard copy, statuses | No | Terminology enforced in `src/connections/managedConnectors.ts`; unit test asserts no vendor string |
| Managed gateway host (`connector-gateway.lovable.dev`) | Yes, in network inspection | Called only from edge functions; disclosed to administrators in the inventory panel |
| App User Connector OAuth callback (`https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`) | Yes, in the address bar during consent | Wizard states the flow leaves AURA; no claim of staying inside AURA |
| Provider consent screen | Yes | Same as above |
| Backend function URLs | Yes | Not surfaced in customer copy |
| Application metadata, exports, evidence reports | No | Reviewed in the claims audit below |

Any connector whose contract forbids a third-party OAuth intermediary is marked
`AURA_NATIVE_REQUIRED` in the manifest (currently: ServiceNow). No managed substitution is
performed silently.
