import { useMemo, type ElementType } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  Activity,
  BookOpen,
  Boxes,
  Cable,
  Compass,
  FileSearch,
  FlaskConical,
  GraduationCap,
  LayoutDashboard,
  RefreshCw,
  Rocket,
  Server,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DCCard, DCSectionHeader } from '@/components/dc-ui';
import { useTour } from '@/context/TourContext';
import { tourRegistry, type TourId } from '@/tours/tourRegistry';

interface GuideLink {
  title: string;
  description: string;
  route: string;
  icon: ElementType;
}

const GETTING_STARTED: GuideLink[] = [
  {
    title: 'Command Center',
    description: 'Read facility status, priority actions, model assumptions and recent simulation results.',
    route: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Facility Blueprint',
    description: 'Understand the canonical facility model, assets, automation definitions, validation and versions.',
    route: '/blueprint/default',
    icon: Boxes,
  },
  {
    title: 'Run a Simulation',
    description: 'Review scenario inputs, execute a deterministic run, compare outcomes and review recommendations.',
    route: '/simulation',
    icon: FlaskConical,
  },
  {
    title: 'Review Evidence',
    description: 'Trace operational and sustainability claims back to provenance and decision records.',
    route: '/dsx/evidence-beta/overview',
    icon: FileSearch,
  },
];

const OPERATE: GuideLink[] = [
  {
    title: 'Connections',
    description: 'Configure, test, map and monitor external systems and data exchange.',
    route: '/manage/integrations',
    icon: Cable,
  },
  {
    title: 'Agents',
    description: 'Review agent scope, recommendations, execution state, configuration and audit history.',
    route: '/app/agents',
    icon: Server,
  },
  {
    title: 'Operations',
    description: 'Use the aggregate operations view for alerts, trends and data availability.',
    route: '/analytics',
    icon: Activity,
  },
  {
    title: 'Runtime',
    description: 'Inspect deployment history, runtime state and step-level execution evidence.',
    route: '/deployments',
    icon: Rocket,
  },
];

const GOVERN: GuideLink[] = [
  {
    title: 'People & Access',
    description: 'Manage members, invitations, approvals and role assignments from one governance area.',
    route: '/teams',
    icon: Users,
  },
  {
    title: 'Agent Policies',
    description: 'Configure approved AI providers, grounding boundaries, safety settings and governance policy.',
    route: '/settings/ai',
    icon: Sparkles,
  },
  {
    title: 'Sovereignty Evidence',
    description: 'Review residency, sovereignty and sustainability evidence without treating modelled claims as certified facts.',
    route: '/dsx/evidence-beta/sustainability/sovereignty',
    icon: Shield,
  },
];

const GUIDED_TOURS: Array<{ id: TourId; route: string; icon: ElementType }> = [
  { id: 'studioIntro', route: '/dashboard', icon: Compass },
  { id: 'overview', route: '/dashboard', icon: LayoutDashboard },
  { id: 'simulation', route: '/simulation', icon: FlaskConical },
  { id: 'blueprint', route: '/blueprint/default', icon: Boxes },
];

function GuideGrid({ items }: { items: GuideLink[] }) {
  const navigate = useNavigate();
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.title}
            type="button"
            onClick={() => navigate(item.route)}
            className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <div className="mb-2 flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              <span className="text-sm font-semibold">{item.title}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
          </button>
        );
      })}
    </div>
  );
}

export default function Help() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { startTour, resetAllTours, isTourSeen } = useTour();

  return (
    <div className="mx-auto max-w-7xl space-y-6 py-6 pb-12">
      <DCSectionHeader
        as="h1"
        title={t('help.title')}
        subtitle="Learn AURA DC by workspace: model the facility, simulate changes, operate the platform and verify evidence."
        icon={<GraduationCap className="h-6 w-6" />}
      />

      <DCCard
        title="Start with the operating model"
        subtitle="AURA separates the facility model, simulations, operational status and evidence so each claim has a clear owner."
        icon={<BookOpen className="h-5 w-5" />}
        status="operational"
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => navigate('/dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Open Command Center
          </Button>
          <Button variant="outline" onClick={() => navigate('/blueprint/default')}>
            <Boxes className="mr-2 h-4 w-4" />
            Open Blueprint
          </Button>
          <Button variant="outline" onClick={() => navigate('/simulation')}>
            <FlaskConical className="mr-2 h-4 w-4" />
            Open Simulation
          </Button>
        </div>
      </DCCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <DCCard title="Getting Started" icon={<Compass className="h-5 w-5" />} status="operational">
          <GuideGrid items={GETTING_STARTED} />
        </DCCard>

        <DCCard title="Operate" icon={<Activity className="h-5 w-5" />} status="operational">
          <GuideGrid items={OPERATE} />
        </DCCard>

        <DCCard title="Govern" icon={<Shield className="h-5 w-5" />} status="operational">
          <GuideGrid items={GOVERN} />
        </DCCard>

        <DCCard
          title="How to read AURA data"
          subtitle="Use these rules before acting on a metric or export."
          icon={<FileSearch className="h-5 w-5" />}
          status="operational"
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Badge variant="outline">LIVE</Badge>
              <p className="text-muted-foreground">Only use LIVE when a validated production source is actually connected.</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">SIMULATED</Badge>
              <p className="text-muted-foreground">Scenario outputs are model results, not measured facility telemetry.</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">DEMO</Badge>
              <p className="text-muted-foreground">Demonstration fixtures explain a workflow but do not establish customer truth.</p>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">NOT ASSESSED</Badge>
              <p className="text-muted-foreground">Absence of evidence is shown explicitly rather than converted into a score.</p>
            </div>
          </div>
        </DCCard>
      </div>

      <DCCard
        title="Guided Tours"
        subtitle="Interactive walkthroughs of the four core AURA DC workspaces."
        icon={<Compass className="h-5 w-5" />}
        status="operational"
      >
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {GUIDED_TOURS.map(({ id, route, icon: Icon }) => {
            const tour = tourRegistry[id];
            const seen = isTourSeen(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  navigate(route);
                  window.setTimeout(() => startTour(id), 350);
                }}
                className="rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" aria-hidden />
                  <span className="text-sm font-medium">{tour.name}</span>
                  {seen && <span className="ml-auto text-xs text-muted-foreground">Viewed</span>}
                </div>
                <p className="line-clamp-3 text-xs text-muted-foreground">{tour.description}</p>
              </button>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={resetAllTours}>
          <RefreshCw className="mr-2 h-3.5 w-3.5" />
          Reset tours
        </Button>
      </DCCard>

      <DCCard
        title="Need product support?"
        subtitle="Use the Learning Hub for product guidance. For account or implementation assistance, contact the M2M team."
        icon={<GraduationCap className="h-5 w-5" />}
      >
        <Button asChild variant="outline">
          <a href="mailto:business@m2mtechconnect.com">Contact M2M Support</a>
        </Button>
      </DCCard>
    </div>
  );
}
