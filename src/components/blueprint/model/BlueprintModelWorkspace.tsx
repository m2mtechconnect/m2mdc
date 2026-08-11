/**
 * Stage 7K — the Blueprint Model operator workspace.
 *
 * Default content answers four questions only: what am I viewing, what is
 * modelled, what requires attention, and where do I go next. Agents, KPI
 * analysis, data-source registries, integrations, roles and metadata live in
 * their canonical destinations and are referenced here as compact links, never
 * reproduced.
 *
 * Simulation ownership: this workspace contains no execution affordance. The
 * single handoff lives in the Blueprint header.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BlueprintModelSection } from '@/workspace/BlueprintModelSection';
import { OperatorSummaryStrip } from './OperatorSummaryStrip';
import { RequiresAttentionPanel } from './RequiresAttentionPanel';
import { ModelDetailSection } from './ModelDetailSection';
import { EvidenceChip } from './EvidenceChip';
import { QuarantinedCapacityPanel } from '../QuarantinedCapacityPanel';
import { buildBlueprintCapacityRecords } from '../blueprintCapacityRecords';
import { collectQuarantinedCapacity } from '@/lib/units/capacityQuarantine';
import {
  DEFAULT_OVERRIDES,
  deriveKpis,
  formatPower,
  useFacilityModel,
} from '@/workspace/facilityModel';
import {
  buildAttentionItems,
  buildOperatorMetrics,
  computeCoverage,
  defaultAccordionState,
  shouldExpandAttention,
  type ModelAccordionId,
  type OperatorModelInput,
} from '@/pages/blueprint/operatorModel';
import type { BlueprintSummary, DataCentreBlueprint } from '@/types/dataCentreBlueprint';

interface Props {
  blueprint: DataCentreBlueprint;
  summary: BlueprintSummary | null;
  blueprintPath: string;
  capacityNote?: string | null;
  /** Where the rendered blueprint was loaded from, used as evidence source. */
  loadSource?: string;
  dbTwinData?: unknown;
  city?: string;
}

export function BlueprintModelWorkspace({
  blueprint,
  summary,
  blueprintPath,
  capacityNote,
  loadSource = 'default',
  dbTwinData,
  city,
}: Props) {
  const facilityOverride = useMemo(
    () => ({
      id: blueprint.twinId || blueprint.id,
      name: blueprint.name,
      city,
      tier: blueprint.tier,
      capacityKw: blueprint.capacityKw,
    }),
    [blueprint.twinId, blueprint.id, blueprint.name, blueprint.tier, blueprint.capacityKw, city],
  );

  const { facility, assets } = useFacilityModel(facilityOverride);

  const quarantined = useMemo(
    () =>
      collectQuarantinedCapacity(
        buildBlueprintCapacityRecords({ blueprint, dbTwin: dbTwinData as never }),
      ),
    [blueprint, dbTwinData],
  );

  const coverage = computeCoverage(facility.rackCount, facility.designRackEstimate);
  // PUE is modelled from the facility definition, so it is reported as
  // derived - never as a measured, authoritative reading.
  const pue = deriveKpis(facility, DEFAULT_OVERRIDES).pue;

  const input: OperatorModelInput = {
    blueprint,
    summary,
    capacityKw: facility.capacityKw,
    capacityLabel: formatPower(facility.capacityKw),
    capacityNote,
    quarantined,
    coverage,
    pue,
    pueTarget: facility.pueTarget,
    pueState: 'derived',
    blueprintPath,
  };

  const metrics = buildOperatorMetrics(input);
  const attention = buildAttentionItems(input);
  const hasConflict = quarantined.length > 0;
  const [open, setOpen] = useState<Record<ModelAccordionId, boolean>>(() =>
    defaultAccordionState(hasConflict),
  );
  const toggle = (id: ModelAccordionId) => (next: boolean) =>
    setOpen((prev) => ({ ...prev, [id]: next }));

  const rackAssets = assets.filter((a) => a.kind === 'rack').length;
  const controlsPath = (sub: string) => `${blueprintPath}?tab=controls&sub=${sub}`;

  return (
    <div className="space-y-3" data-testid="blueprint-model-workspace">
      {/* The visualization is the dominant element of the first viewport. */}
      <BlueprintModelSection facilityOverride={facilityOverride} />

      <OperatorSummaryStrip metrics={metrics} />

      <RequiresAttentionPanel items={attention} defaultOpen={shouldExpandAttention(attention)} />

      <ModelDetailSection
        title="Model details"
        status={coverage.percent >= 100 ? 'Complete' : 'Partial'}
        itemCount={4}
        summary={`${facility.tier} · ${formatPower(facility.capacityKw)} · ${coverage.renderedRacks} rendered racks in ${facility.rowCount} rows`}
        open={open['model-details']}
        onToggle={toggle('model-details')}
        testId="blueprint-accordion-model-details"
      >
        <dl className="grid gap-2 sm:grid-cols-2">
          <Row label="Facility" value={`${facility.name} · ${facility.city}`} />
          <Row label="Tier" value={facility.tier} />
          <Row label="Design capacity" value={formatPower(facility.capacityKw)} />
          <Row label="Rows modelled" value={String(facility.rowCount)} />
          <Row label="Rendered racks" value={String(coverage.renderedRacks)} />
          <Row label="Estimated facility total" value={String(coverage.estimatedTotal)} />
          <Row label="Visualization coverage" value={`${coverage.percent}%`} />
          <Row label="Modelled assets" value={`${assets.length} (${rackAssets} racks)`} />
        </dl>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Assumption: unrendered racks are represented by an aggregate load model. A partial model
          is never reported as a complete facility. Full topology and dependencies live in{' '}
          <Link className="underline" to={`${blueprintPath}?tab=assets`}>
            Assets &amp; Systems
          </Link>
          .
        </p>
      </ModelDetailSection>

      <ModelDetailSection
        title="Data confidence and provenance"
        status={hasConflict ? 'Conflict' : capacityNote ? 'Derived' : 'Verified'}
        itemCount={quarantined.length + 3}
        summary={
          hasConflict
            ? `${quarantined.length} capacity record${quarantined.length === 1 ? '' : 's'} quarantined and withheld from KPIs`
            : 'Stored capacity, canonical unit, evidence source and freshness'
        }
        open={open['data-confidence']}
        onToggle={toggle('data-confidence')}
        testId="blueprint-accordion-data-confidence"
      >
        <dl className="grid gap-2 sm:grid-cols-2">
          <Row label="Stored capacity" value={`${blueprint.capacityKw}`} />
          <Row label="Canonical unit" value="capacity_kw" />
          <Row label="Evidence source" value={loadSource} />
          <Row
            label="Data freshness"
            value={blueprint.updatedAt ? new Date(blueprint.updatedAt).toLocaleString() : 'Not recorded'}
          />
        </dl>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <EvidenceChip state={hasConflict ? 'conflicting' : capacityNote ? 'derived' : 'authoritative'} />
          {capacityNote && <span className="text-[11px] text-muted-foreground">{capacityNote}</span>}
        </div>
        <div className="mt-3">
          <QuarantinedCapacityPanel
            records={buildBlueprintCapacityRecords({ blueprint, dbTwin: dbTwinData as never })}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          <Link className="underline" to={`${blueprintPath}?tab=validation`}>
            Open Validation
          </Link>{' '}
          for the full readiness result.
        </p>
      </ModelDetailSection>

      <ModelDetailSection
        title="Linked configuration"
        status="Read-only"
        itemCount={4}
        summary="Controls, data sources, integrations and governance owned by other workspaces"
        open={open['linked-config']}
        onToggle={toggle('linked-config')}
        testId="blueprint-accordion-linked-config"
      >
        <ul className="grid gap-1.5 sm:grid-cols-2">
          <LinkRow
            to={controlsPath('agents')}
            label="Agents"
            value={`${blueprint.agents.length} configured`}
          />
          <LinkRow to={controlsPath('kpis')} label="KPIs" value={`${blueprint.kpis.length} tracked`} />
          <LinkRow
            to={controlsPath('workflows')}
            label="Workflows"
            value={`${blueprint.workflows.filter((w) => w.enabled).length} enabled`}
          />
          <LinkRow
            to={`${blueprintPath}?tab=validation`}
            label="Data sources"
            value={`${blueprint.dataSources.length} in readiness result`}
          />
          <LinkRow
            to="/integrations"
            label="Integrations"
            value={`${blueprint.integrations.length} managed in Manage`}
          />
          <LinkRow
            to={`${blueprintPath}?tab=validation`}
            label="Data sovereignty"
            value={`${String(blueprint.jurisdiction ?? 'Jurisdiction')} validation status`}
          />
        </ul>
      </ModelDetailSection>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2.5 py-1.5">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="truncate text-[11px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

function LinkRow({ to, label, value }: { to: string; label: string; value: string }) {
  return (
    <li>
      <Link
        to={to}
        className="flex min-h-11 items-center justify-between gap-2 rounded border border-border px-2.5 py-1.5 text-[11px] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-medium text-foreground">{label}</span>
        <span className="truncate text-muted-foreground">{value}</span>
      </Link>
    </li>
  );
}