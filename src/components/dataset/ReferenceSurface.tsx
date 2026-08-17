/**
 * Renders a migrated surface entirely from the centralized dataset selectors.
 *
 * While the reference canary is active this component replaces the legacy page
 * component for every REFERENCE_DATA_CONSUMER surface, so no legacy synthetic
 * value can reach the screen through a hidden import.
 *
 * Page identity is NOT generic: the route's adapter
 * (`src/data/dataset/referenceAdapters.ts`) supplies the real page title,
 * navigation group, user job, tab structure, controls, export identity and an
 * explicit list of interactions that are unavailable in reference mode.
 */
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { UnavailableState } from './UnavailableState';
import { DatasetValueRow } from './DatasetValueRow';
import { useDataset } from '@/data/dataset/DatasetProvider';
import type { SurfaceEntry, SurfaceSection } from '@/data/dataset/surfaceRegistry';
import { adapterForPath } from '@/data/dataset/referenceAdapters';
import {
  allReferenceValues,
  derivedFacilities,
  montrealNotSupplied,
  referenceConfigurationIds,
  referenceConfigurations,
  referenceFacilities,
  referenceKpiValues,
  referenceScenarios,
  referenceSpecificationsForSite,
  searchDataset,
} from '@/data/dataset/referenceSelectors';
import { buildRunLineage, compareConfigurations, deriveDesignFromReference } from '@/data/dataset/referenceRun';
import { toCsv, toJsonExport } from '@/data/dataset/exportProvenance';
import { answerFromDataset } from '@/data/dataset/assistantGrounding';
import { CLASSIFIED_FACILITIES, operationalFacilities } from '@/data/dsxReference';
import { NGC_DEPENDENT_DATA_CLASSES } from '@/data/dataset/valueClassification';

const DEFAULT_CONFIG = 'virginia-gb300';

const MANDATORY_STATEMENT =
  'AURA implements a hybrid DSX-aligned architecture. No NVIDIA DSX runtime service or ' +
  'SimReady-validated capability is currently claimed. NVIDIA OpenUSD-derived geometry and ' +
  'normalized reference data are reported as provenance, not as proof of complete DSX integration.';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-xs">{children}</CardContent>
    </Card>
  );
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReferenceSurface({ surface }: { surface: SurfaceEntry }) {
  const { mode, descriptor } = useDataset();
  const pageAdapter = adapterForPath(surface.path);
  const [activeTab, setActiveTab] = useState(pageAdapter?.tabs[0]?.id ?? 'default');
  const [configurationId, setConfigurationId] = useState(DEFAULT_CONFIG);
  const [compareWith, setCompareWith] = useState('sweden-gb300');
  const [query, setQuery] = useState('');
  const [question, setQuestion] = useState('');
  const [derivation, setDerivation] = useState<string | null>(null);

  const configIds = useMemo(referenceConfigurationIds, []);
  const kpis = useMemo(() => referenceKpiValues(configurationId), [configurationId]);
  const site = configurationId.split('-').slice(0, -1).join(' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const specs = useMemo(() => referenceSpecificationsForSite(site), [site]);
  const lineage = useMemo(
    () =>
      buildRunLineage({
        dataset: mode,
        configurationId,
        scenarioRecordIds: referenceScenarios().map((s) => s.recordId ?? s.key),
      }),
    [mode, configurationId],
  );
  const answer = useMemo(
    () => (question ? answerFromDataset(question, { dataset: mode, facilityId: null, isAdmin: true }) : null),
    [question, mode],
  );

  const currentTab =
    pageAdapter?.tabs.find((t) => t.id === activeTab) ?? pageAdapter?.tabs[0] ?? null;
  const activeSections: readonly SurfaceSection[] = currentTab
    ? currentTab.sections
    : surface.sections;
  const has = (s: SurfaceSection) => activeSections.includes(s);
  const exportStem = pageAdapter?.exportStem ?? 'aura-reference-export';
  const exportValues = kpis.length > 0 ? kpis : allReferenceValues();
  const exportCtx = {
    dataset: mode,
    facilityId: `dsx-reference-${site.toLowerCase().replace(/\s+/g, '-')}`,
    simulationRunId: lineage.status === 'READY' ? lineage.lineageId : null,
  };

  return (
    <div
      className="space-y-4 py-6"
      data-testid="reference-surface"
      data-surface={surface.path}
      data-page-id={pageAdapter?.pageId ?? 'unmapped'}
    >
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-foreground">
            {pageAdapter?.pageTitle ?? surface.title}
          </h1>
          {pageAdapter && <Badge variant="outline">{pageAdapter.navGroup}</Badge>}
        </div>
        {pageAdapter && (
          <p className="mt-1 text-xs text-foreground">{pageAdapter.userJob}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground">
          Rendered from {descriptor.label}. Reference data only: not measured, not live, not
          commissioned, not an NVIDIA runtime integration.
        </p>
      </header>

      {pageAdapter && pageAdapter.tabs.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-border pb-2" role="tablist" aria-label={`${pageAdapter.pageTitle} sections`}>
          {pageAdapter.tabs.map((t) => (
            <Button
              key={t.id}
              role="tab"
              aria-selected={t.id === currentTab?.id}
              size="sm"
              variant={t.id === currentTab?.id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(t.id)}
              data-testid={`reference-tab-${t.id}`}
            >
              {t.label}
            </Button>
          ))}
        </div>
      )}

      {currentTab && <p className="text-xs text-muted-foreground">{currentTab.intent}</p>}

      {(pageAdapter?.showConfigurationSelector ?? true) && (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Reference configuration</span>
        {configIds.map((id) => (
          <Button
            key={id}
            size="sm"
            variant={id === configurationId ? 'default' : 'outline'}
            onClick={() => setConfigurationId(id)}
          >
            {id}
          </Button>
        ))}
      </div>
      )}

      {has('facilities') && (
        <Section title="Facilities">
          <p className="mb-2 text-muted-foreground">
            Reference facilities: {referenceFacilities().length}. AURA-derived scenarios:{' '}
            {derivedFacilities().length}. Operational facilities: {operationalFacilities().length}.
            Reference and derived facilities never contribute to operational totals.
          </p>
          {CLASSIFIED_FACILITIES.map((f) => (
            <div key={f.id} className="flex items-center justify-between border-b border-border/60 py-1">
              <span className="text-foreground">{f.name}</span>
              <span className="flex gap-1">
                <Badge variant="outline">{f.facilityClass}</Badge>
                <Badge variant="outline">{f.authoredBy}</Badge>
              </span>
            </div>
          ))}
        </Section>
      )}

      {has('kpis') && (
        <Section title={`Reference KPI values - ${configurationId}`}>
          {kpis.map((v) => (
            <DatasetValueRow key={v.recordId ?? v.key} value={v} />
          ))}
          <p className="pt-2 text-muted-foreground">
            The source publishes single reference values with no time series, so no trend arrow and
            no history chart is rendered.
          </p>
        </Section>
      )}

      {has('specifications') && (
        <Section title={`Site specifications - ${site}`}>
          {specs.length === 0 ? (
            <UnavailableState label={`Specifications for ${site}`} />
          ) : (
            specs.map((v) => <DatasetValueRow key={v.recordId ?? v.key} value={v} />)
          )}
          <p className="pt-2 text-muted-foreground">
            Dimensions, electrical topology and engineering inputs beyond the published
            specifications are Not supplied by the pinned source.
          </p>
        </Section>
      )}

      {has('configurations') && (
        <Section title="Reference configurations">
          {referenceConfigurations().map((v) => (
            <DatasetValueRow key={v.recordId ?? v.key} value={v} />
          ))}
        </Section>
      )}

      {has('scenarios') && (
        <Section title="Reference scenarios">
          {referenceScenarios().map((v) => (
            <DatasetValueRow key={v.recordId ?? v.key} value={v} />
          ))}
        </Section>
      )}

      {has('montreal') && (
        <Section title="Montreal DSX-Aligned AI Factory Scenario (AURA-authored)">
          <p className="mb-2 text-muted-foreground">
            Derived and simulated. Not commissioned, not connected. No NVIDIA site fact is
            attributed to this scenario.
          </p>
          {montrealNotSupplied().map((v) => (
            <DatasetValueRow key={v.key} value={v} />
          ))}
        </Section>
      )}

      {has('derivation') && (
        <Section title="Derive an AURA design from this reference configuration">
          <p className="mb-2 text-muted-foreground">
            Copying never mutates an NVIDIA reference record. Confirmation creates a new
            AURA-owned, non-commissioned design carrying parent record IDs and dataset version.
          </p>
          <Button
            size="sm"
            onClick={() =>
              setDerivation(
                JSON.stringify(
                  deriveDesignFromReference(
                    configurationId,
                    kpis.map((k) => k.recordId ?? k.key),
                    new Date().toISOString(),
                  ),
                  null,
                  2,
                ),
              )
            }
            data-testid="derive-design"
          >
            Confirm derivation
          </Button>
          {derivation && (
            <pre className="mt-2 overflow-x-auto rounded bg-muted/40 p-2 text-[11px]">{derivation}</pre>
          )}
        </Section>
      )}

      {has('run-lineage') && (
        <Section title="Simulation run lineage">
          {lineage.status === 'BLOCKED' ? (
            <div data-testid="run-blocked">
              <p className="font-medium text-foreground">Execution blocked</p>
              <p className="text-muted-foreground">{lineage.explanation}</p>
              <ul className="mt-1 list-disc pl-4">
                {lineage.missingInputs.map((m) => (
                  <li key={m.key}>
                    {m.label}: {m.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5" data-testid="run-lineage">
              <dt className="text-muted-foreground">Run lineage id</dt>
              <dd className="font-mono text-foreground">{lineage.lineageId}</dd>
              <dt className="text-muted-foreground">Dataset version</dt>
              <dd className="text-foreground">{lineage.datasetVersion}</dd>
              <dt className="text-muted-foreground">Input records</dt>
              <dd className="text-foreground">{lineage.inputRecordIds.length}</dd>
              <dt className="text-muted-foreground">Scenario records</dt>
              <dd className="text-foreground">{lineage.scenarioRecordIds.join(', ')}</dd>
              <dt className="text-muted-foreground">Result classification</dt>
              <dd className="text-foreground">{lineage.resultClassification}</dd>
              <dt className="text-muted-foreground">Attribution</dt>
              <dd className="text-foreground">{lineage.attribution}</dd>
            </dl>
          )}
        </Section>
      )}

      {has('compare') && (
        <Section title="Compare reference configurations">
          <div className="mb-2 flex flex-wrap gap-1">
            {configIds.map((id) => (
              <Button
                key={id}
                size="sm"
                variant={id === compareWith ? 'default' : 'outline'}
                onClick={() => setCompareWith(id)}
              >
                {id}
              </Button>
            ))}
          </div>
          {compareConfigurations(configurationId, compareWith).map((row) => (
            <div key={row.metricKey} className="flex justify-between border-b border-border/60 py-1">
              <span className="text-foreground">{row.label}</span>
              <span className="text-right">
                {row.comparable ? (
                  <>
                    {String(row.left?.value)} {row.left?.unit} vs {String(row.right?.value)}{' '}
                    {row.right?.unit}
                  </>
                ) : (
                  <Badge variant="outline">Not comparable: {row.reason}</Badge>
                )}
              </span>
            </div>
          ))}
        </Section>
      )}

      {has('review') && (
        <Section title="Review">
          <p className="text-muted-foreground">
            Bound to run {lineage.status === 'READY' ? lineage.lineageId : 'none (blocked)'} and
            dataset version {descriptor.datasetVersion}. Inputs, derived values, unresolved inputs,
            reference values and simulation outputs keep their classification. Review status:
            pending human sign-off.
          </p>
        </Section>
      )}

      {has('evidence') && (
        <Section title="Record-level evidence">
          {allReferenceValues()
            .slice(0, 12)
            .map((v) => (
              <div key={v.recordId ?? v.key} className="border-b border-border/60 py-1">
                <p className="text-foreground">{v.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {v.recordId} - {v.datasetId}@{v.datasetVersion} - commit{' '}
                  {v.sourceCommit?.slice(0, 8)} - sha256 {v.sourceChecksum?.slice(0, 12)} -
                  ingested {v.ingestedAt} - {v.normalizationRule} - {v.classification} -{' '}
                  {v.licenceStatus}
                </p>
              </div>
            ))}
          <p className="pt-2 text-muted-foreground">
            Showing 12 of {allReferenceValues().length} normalized records. Export for the full set
            with lineage.
          </p>
        </Section>
      )}

      {has('export') && (
        <Section title="Export">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              data-testid="export-csv"
              onClick={() =>
                download(`${exportStem}.csv`, toCsv(exportValues, exportCtx), 'text/csv')
              }
            >
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              data-testid="export-json"
              onClick={() =>
                download(
                  `${exportStem}.json`,
                  JSON.stringify(toJsonExport(exportValues, exportCtx), null, 2),
                  'application/json',
                )
              }
            >
              Export JSON
            </Button>
          </div>
          <p className="mt-2 text-muted-foreground">
            Every row carries dataset id and version, facility, record id, classification, unit,
            source checksum, run id and availability state. Unavailable values export as their
            state, never as 0 or an empty measurement.
          </p>
        </Section>
      )}

      {has('search') && (
        <Section title="Search the reference dataset">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search records, specifications, scenarios and facilities"
            className="mb-2 h-8 text-xs"
            data-testid="reference-search-input"
          />
          {searchDataset(query)
            .slice(0, 25)
            .map((hit) => (
              <div key={hit.id} className="flex justify-between border-b border-border/60 py-1">
                <span className="text-foreground">{hit.title}</span>
                <span className="text-muted-foreground">
                  {hit.classification} - {hit.datasetId ?? 'no dataset'} - {hit.id}
                </span>
              </div>
            ))}
        </Section>
      )}

      {has('assistant') && (
        <Section title="Grounded assistant">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about the reference dataset"
            className="mb-2 h-8 text-xs"
          />
          {answer && (
            <div>
              <Badge variant="outline">{answer.outcome}</Badge>
              <pre className="mt-1 whitespace-pre-wrap text-[11px] text-foreground">{answer.answer}</pre>
            </div>
          )}
        </Section>
      )}

      {has('telemetry') && (
        <Section title="Telemetry and analytics">
          <p className="text-muted-foreground">
            The reference dataset contains single published values and no time-series source.
            Historical telemetry is unavailable: no refresh loop runs, and no measurement timestamp
            is generated on this surface.
          </p>
        </Section>
      )}

      {has('agents') && (
        <Section title="Subsystem agents">
          <p className="text-muted-foreground">
            Reference-aligned scenario definitions only. No NVIDIA agent, NIM service or DSX runtime
            agent is active or claimed.
          </p>
          {referenceScenarios().map((v) => (
            <DatasetValueRow key={v.recordId ?? v.key} value={v} />
          ))}
        </Section>
      )}

      {has('integrations') && (
        <Section title="Reference sources">
          <div className="space-y-1">
            <div className="flex justify-between border-b border-border/60 py-1">
              <span className="text-foreground">NVIDIA GitHub (DSX blueprint)</span>
              <Badge variant="outline">REFERENCE_SOURCE</Badge>
            </div>
            <div className="flex justify-between border-b border-border/60 py-1">
              <span className="text-foreground">NVIDIA NGC dsx_dataset v2.1</span>
              <Badge variant="outline">AUTHORIZATION_REQUIRED</Badge>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-foreground">Operational telemetry ingestion</span>
              <Badge variant="outline">NOT_CONNECTED</Badge>
            </div>
          </div>
        </Section>
      )}

      {has('assets') && (
        <Section title="Asset provenance">
          <p className="text-muted-foreground">
            OpenUSD-derived geometry is reported as ingestion provenance only. It is not SimReady
            validation. NGC-dependent assets remain blocked.
          </p>
        </Section>
      )}

      {has('deployments') && (
        <Section title="Validation and execution lanes">
          <p className="text-muted-foreground">
            Brev and AWS remain planned validation and execution lanes. No deployment evidence
            exists, so no lane is shown as active.
          </p>
        </Section>
      )}

      {has('glossary') && (
        <Section title="What these states mean">
          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1">
            <dt className="text-foreground">Reference</dt>
            <dd className="text-muted-foreground">Published by NVIDIA; not measured, not live.</dd>
            <dt className="text-foreground">Derived</dt>
            <dd className="text-muted-foreground">AURA-authored from a reference input, with lineage.</dd>
            <dt className="text-foreground">Simulated</dt>
            <dd className="text-muted-foreground">An AURA model output, never an NVIDIA result.</dd>
            <dt className="text-foreground">Operational</dt>
            <dd className="text-muted-foreground">Commissioned and connected. None exist today.</dd>
            <dt className="text-foreground">Not supplied</dt>
            <dd className="text-muted-foreground">The source has no defensible value for this input.</dd>
            <dt className="text-foreground">Unavailable</dt>
            <dd className="text-muted-foreground">Blocked upstream; no substitution is made.</dd>
            <dt className="text-foreground">Not connected</dt>
            <dd className="text-muted-foreground">A source exists but no runtime connection is claimed.</dd>
          </dl>
          <p className="mt-2 text-muted-foreground">{MANDATORY_STATEMENT}</p>
        </Section>
      )}

      {has('ngc') && (
        <Section title="NGC-dependent data">
          <div className="space-y-2">
            {NGC_DEPENDENT_DATA_CLASSES.map((cls) => (
              <UnavailableState key={cls} label={cls} />
            ))}
          </div>
        </Section>
      )}

      {pageAdapter && pageAdapter.workflowLimitations.length > 0 && (
        <Section title="Not available while the reference dataset is active">
          <ul className="list-disc space-y-1 pl-4 text-muted-foreground">
            {pageAdapter.workflowLimitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </Section>
      )}

      <p className="text-[11px] text-muted-foreground">{MANDATORY_STATEMENT}</p>
    </div>
  );
}

export default ReferenceSurface;