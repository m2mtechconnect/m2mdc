# White-label and disclosure matrix

Customer-facing branding (must be AURA-neutral):

| Surface | Result |
|---|---|
| Navigation | Pass |
| Connector cards | Pass |
| Setup wizard | Pass |
| Authorization instructions | Pass |
| Detail drawer | Pass |
| Toasts | Pass |
| Errors (safe_message) | Pass |
| Evidence views | Pass |
| Exports and metadata | Pass |

Automated guard: src/test/whiteLabelSurfaces.test.ts fails the build on prohibited platform vendor names, provider OAuth setup instructions, service-role or token material, and provider credential paste instructions in rendered prose.

Unavoidable technical disclosures (not branding failures, and not claimed to be invisible):

- OAuth callback domain connector-gateway.lovable.dev appears in the provider consent redirect chain.
- The connector gateway hostname is visible in developer-tools network inspection of server-side calls only if surfaced in error detail.
- The provider consent screen is operated by Google and displays the AURA-owned OAuth application name.
- Edge function names are visible in browser network requests.
