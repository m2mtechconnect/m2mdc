# Security memory correction

- Six permissive `USING (true)` read policies were removed across two passes.
- Upstream authentication already caused anonymous requests to return HTTP 401
  because no table GRANT existed for `anon`.
- The remediation therefore closed a latent policy exposure.
- Active historical exploitation was not demonstrated and must not be claimed.
- Same-tenant and cross-tenant engineer authorization tests remain
  BLOCKED_UNVERIFIED; security closure is not complete until they pass.
