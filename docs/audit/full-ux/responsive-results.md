# Phase 13 - responsive results

Viewports executed: 1920x1080, 1440x900, 1024x768, 390x844 (17-route sample for all but 1440x900, which covered 85 routes). 1280x800 and 768x1024 and browser zoom levels were NOT executed - BLOCKED_UNVERIFIED.

- 1440x900 and 1920x1080: no horizontal overflow detected.
- 1024x768: horizontal overflow on all 15 sampled application routes, including `/dashboard`, `/simulation`, `/blueprint/default` and `/data-centre-twin` - P1, the tablet/small-laptop layout is a compressed desktop.
- 390x844: horizontal overflow on the same 15 routes - P1, mobile is not a supported layout today.
- Touch-target, safe-area and on-screen keyboard behaviour: BLOCKED_UNVERIFIED.
