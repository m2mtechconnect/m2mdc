import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutTemplate, FolderOpen, ArrowRight } from 'lucide-react';

interface BuildRow {
  id: string;
  name: string;
  status: string;
  updated_at: string | null;
  created_at: string | null;
}

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  category: string;
}

/**
 * Lists the operator's existing builds and the available templates so the
 * Builder landing surface is a real workspace, not just a single CTA.
 * Every row links back into the wizard with explicit intent parameters.
 */
export function BuilderStarterLists() {
  const [builds, setBuilds] = useState<BuildRow[] | null>(null);
  const [templates, setTemplates] = useState<TemplateRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [buildsRes, templatesRes] = await Promise.all([
          supabase
            .from('agents')
            .select('id, name, status, updated_at, created_at')
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(8),
          supabase
            .from('agent_templates')
            .select('id, name, description, category')
            .order('name')
            .limit(6),
        ]);

        if (cancelled) return;
        if (buildsRes.error) throw buildsRes.error;
        if (templatesRes.error) throw templatesRes.error;

        setBuilds((buildsRes.data ?? []) as BuildRow[]);
        setTemplates((templatesRes.data ?? []) as TemplateRow[]);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load builds and templates');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (loadError) {
    return (
      <p role="status" className="rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        Existing builds and templates are unavailable right now: {loadError}
      </p>
    );
  }

  return (
    <div className="grid items-start gap-6 md:grid-cols-2">
      <section aria-labelledby="builder-existing-heading" className="rounded-lg border border-border bg-card p-4 text-left">
        <div className="mb-3 flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-primary" aria-hidden="true" />
          <h2 id="builder-existing-heading" className="text-sm font-semibold">
            Your builds
          </h2>
        </div>
        {builds && builds.length > 0 ? (
          <ul className="max-h-[22rem] space-y-2 overflow-y-auto pr-1">
            {builds.map((build) => (
              <li key={build.id}>
                <Link
                  to={`/builder?draft=${build.id}`}
                  className="flex items-center justify-between gap-3 rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {build.name?.trim() ? build.name : 'Untitled build'}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {build.updated_at
                        ? `Updated ${formatDistanceToNow(new Date(build.updated_at), { addSuffix: true })}`
                        : 'No update timestamp recorded'}
                    </span>
                  </span>
                  <Badge variant="secondary" className="shrink-0 capitalize">
                    {build.status}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No builds saved to your account yet. Start blank or pick a template below.
          </p>
        )}
      </section>

      <section aria-labelledby="builder-templates-heading" className="rounded-lg border border-border bg-card p-4 text-left">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-4 w-4 text-primary" aria-hidden="true" />
            <h2 id="builder-templates-heading" className="text-sm font-semibold">
              Available templates
            </h2>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/marketplace">
              Browse marketplace
              <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        {templates && templates.length > 0 ? (
          <ul className="space-y-2">
            {templates.map((template) => (
              <li key={template.id}>
                <Link
                  to={`/builder?templateId=${template.id}`}
                  className="block rounded-md border border-transparent px-2 py-2 hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium">{template.name}</span>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {template.category}
                    </Badge>
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-xs text-muted-foreground">
                    {template.description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No templates are published to this workspace yet.
          </p>
        )}
      </section>
    </div>
  );
}
