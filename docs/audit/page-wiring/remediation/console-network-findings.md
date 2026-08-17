# Console and network findings - final build

| Surface | Finding | State |
| --- | --- | --- |
| Landing `/` | `/grid-pattern.svg` returned 404 on the first published candidate | Fixed, asset added, now HTTP 200 `image/svg+xml`; landing console is clean |
| Landing `/` | `hero-datacenter.mp4` `net::ERR_ABORTED` in headless Chromium | Environment only, no H.264 decoder; asset verified over HTTP |
| `/omniverse-scene` | previously aborted `/auth/v1/user` | Resolved, zero session requests observed |
| All routes | `*.clarity.ms/collect` request failures | Third-party analytics blocked by the sandbox network, out of scope |
| `/this-route-does-not-exist` | deliberate 404 log message | Expected |

No unexplained console errors remain on the audited surfaces.
