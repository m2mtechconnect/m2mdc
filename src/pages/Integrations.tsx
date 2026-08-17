/**
 * Integrations (canonical destination for every "is anything connected?"
 * question). Stage 6D consolidated Settings → Integrations → NVIDIA DSX and
 * the connector marketplace behind this single workspace.
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NvidiaDsxReadinessPanel } from '@/components/integrations/NvidiaDsxReadinessPanel';
import { ArrowRight, Plug } from 'lucide-react';
import { PagePurpose } from '@/components/capability/PagePurpose';

const SOURCES: Array<{ name: string; state: string; detail: string; href?: string; cta?: string }> = [
  {
    name: 'Facility telemetry (BMS / DCIM)',
    state: 'Not connected',
    detail: 'No building-management or DCIM source is attached. Every value in AURA DC is modelled.',
    href: '/connect/monitor',
    cta: 'View connection checks',
  },
  {
    name: 'NVIDIA DSX Exchange',
    state: 'Not deployed',
    detail: 'The official distribution and its AsyncAPI schemas are not present in this environment.',
  },
  {
    name: 'Connector catalogue',
    state: 'Catalogue only',
    detail: 'Available connector definitions. Listing a connector does not mean it is configured.',
    href: '/marketplace?tab=integrations',
    cta: 'Browse connectors',
  },
];

export default function Integrations() {
  useEffect(() => {
    document.title = 'Integrations | AURA DC';
  }, []);

  return (
    <div className="space-y-6 pb-10" data-testid="integrations-page">
        <header className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Plug className="h-5 w-5 text-muted-foreground" aria-hidden />
            Integrations
          </h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Connection and readiness state for every external system. Nothing listed here is
            currently supplying data to AURA DC.
          </p>
          <PagePurpose route="/manage/integrations" />
        </header>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Data sources</CardTitle>
            <CardDescription>What AURA DC would read from, and whether it is attached.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {SOURCES.map((s) => (
              <div
                key={s.name}
                className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-[240px] flex-1">
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[11px]">{s.state}</Badge>
                  {s.href && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to={s.href}>
                        {s.cta}
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <NvidiaDsxReadinessPanel />
    </div>
  );
}
