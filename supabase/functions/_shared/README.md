# Shared Edge Runtime Contracts

## AI runtime

AURA currently uses one supported managed AI execution path through `_shared/ai-client.ts`.

### Supported runtime

- Provider contract: managed AURA AI
- Underlying managed gateway credential: `LOVABLE_API_KEY`
- Canonical text profiles: `reasoning`, `balanced`, `fast`, `fallback`
- Profile-to-model resolution: server-owned in `ai-client.ts`
- Image model: `google/gemini-3-pro-image-preview`

`USE_EXTERNAL_GOOGLE=true` is retained only as a legacy environment signal. It does **not** switch runtime execution because the external Google adapter is not implemented in the current shared client. Requests remain on the supported managed path until a complete provider adapter is added and qualified.

This prevents configuration from selecting a known non-functional runtime branch.
Feature handlers must not accept or forward a provider endpoint, API key or arbitrary
model id. They call `makeAIResponse`, `makeAICompletion` or
`makeAIStreamingCompletion` with a server-owned profile and operation name.

Provider error bodies are replaced with a safe correlation response at this boundary.
Use `getAIResponseEvidence(response)` when an existing response or run record needs to
report the actual executed profile/model. Never report a draft's stored model value as
execution evidence.

## Shared request boundaries

Edge Functions should reuse the shared contracts in this directory instead of implementing local variants:

- `auth.ts` — canonical request authentication and administrative authorization context
- `callerIdentity.ts` — compatibility wrapper for handlers using `requireCaller` / `requireCallerRole`
- `adminAuthorization.ts` — approved-profile, role and tenant authorization before privileged client creation
- `cors.ts` — canonical CORS allowlist, preflight and response headers
- `ai-client.ts` — supported AI runtime selection and health checks

## Implementation rule

New or modified browser-facing Edge Functions should follow this sequence:

1. validate CORS / preflight;
2. validate method;
3. authenticate through the shared auth boundary;
4. authorize role/tenant where required;
5. validate request input;
6. call domain logic;
7. return a normalized JSON response.

Do not introduce a new provider, local wildcard CORS object, ad-hoc bearer parser, or service-role client before authorization simply to make one handler pass.
