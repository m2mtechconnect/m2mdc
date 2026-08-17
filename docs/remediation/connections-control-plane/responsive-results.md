# Responsive results

Measured with Playwright on the running build, authenticated administrator session.

| Viewport | Document overflow | Result |
| --- | --- | --- |
| 1920x1080 | none | pass |
| 1440x900 | none | pass |
| 1280x800 | none | pass |
| 1024x768 | none | pass |
| 768x1024 | none | pass |
| 390x844 | none | pass |

Tab strip scrolls locally on narrow screens; summary cards and connection rows stack. Verified on
`/manage/integrations`, `/manage/connections` and `/admin/platform-readiness`.
