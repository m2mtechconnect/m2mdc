# UI route map

| Route | Status | Component |
| --- | --- | --- |
| `/manage/integrations` | canonical, preserved | `src/pages/Connections.tsx` |
| `/manage/connections` | new alias | `src/pages/Connections.tsx` |
| `/integrations`, `/settings/integrations`, `/marketplace/integrations` | legacy aliases, unchanged | redirect to canonical |
| `/settings/integrations/nvidia-dsx` | legacy alias, unchanged | redirect to canonical hash |
| `/admin/platform-readiness` | new | `src/pages/admin/PlatformReadiness.tsx` |

Tabs are deep-linkable via `?tab=connections|catalogue|mappings|activity|dsx-exchange|agent-tools`.
Navigation label changed from "Integrations" to "Connections"; `href` unchanged.
