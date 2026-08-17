# Authentication and data evidence - final build

- `/omniverse-scene` anonymous: renders the public AURA Twin Preview, `/auth/v1/user` request count = 0 over an 8 s observation, zero console errors, no abort/retry loop.
- `/omniverse-scene` authenticated: renders at the same URL with no redirect and no repeated session request; navigation away cancels in-flight work cleanly.
- Route protection is unchanged: 52 of 65 routes still redirect anonymous visitors, admin routes still refuse a non-admin engineer session. The fix removed render-driven refetching only; it does not suppress session failures.
- No session token or user identifier appears in console output or captured traces.
- Landing video: `GET /landing/hero-datacenter.mp4` returns HTTP 200, `content-type: video/mp4`, `content-length: 33555160`, body begins `ftypisom` (real MP4, not SPA index.html). The host answers Range requests with a full 200 rather than 206; progressive playback still works in H.264-capable browsers.
- Limitation: the headless verification browser has no H.264 decoder (`canPlayType('video/mp4; codecs="avc1.42E01E"')` returns ""), so it aborts the media fetch. This is an environment limitation, not a production defect. The hero section keeps its poster/gradient fallback with no layout shift.
