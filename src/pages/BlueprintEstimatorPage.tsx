/**
 * Public blueprint estimator page.
 *
 * Visitors enter their own data-centre design specs and get a simulated
 * PUE / carbon / cost report. All arithmetic runs client-side in
 * `runBlueprintEstimate`. No backend, tenant, or telemetry data is read or
 * written, and every output is labelled as simulated design-time output.
 */
import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { AuraLogo } from '@/components/brand/AuraLogo';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TwinFooter } from '@/components/landing/TwinFooter';
import { BlueprintLeadForm } from '@/components/blueprint/BlueprintLeadForm';
import {
  ESTIMATOR_DEFAULTS,
  REGION_KEYS,
  runBlueprintEstimate,
  type BlueprintEstimatorInput,
  type ClimateBand,
  type CoolingTopology,
} from '@/lib/blueprint/publicBlueprintEstimator';
import {
  PUBLIC_SCENARIO_IDS,
  runPublicScenario,
  type PublicScenarioId,
  type ScenarioRunResult,
} from '@/lib/blueprint/publicScenarioRun';


const COOLING_OPTIONS: CoolingTopology[] = ['air', 'rear-door', 'direct-liquid', 'immersion'];
const CLIMATE_OPTIONS: ClimateBand[] = ['cold', 'temperate', 'hot'];

const fieldClass =
  'h-11 rounded-none border-white/15 bg-[#111112] text-sm text-[#F5F7FA] placeholder:text-[#7C838C] focus-visible:ring-success';
const selectClass =
  'h-11 w-full rounded-none border border-white/15 bg-[#111112] px-3 text-sm text-[#F5F7FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success';
const labelClass = 'text-xs font-semibold uppercase tracking-[0.16em] text-[#AEB4BC]';

function numberFormat(value: number, digits = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function currency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${numberFormat(value / 1_000_000, 2)}M`;
  if (Math.abs(value) >= 1_000) return `${numberFormat(value / 1_000, 1)}k`;
  return numberFormat(value, 0);
}

export default function BlueprintEstimatorPage() {
  const { t } = useTranslation();
  const [spec, setSpec] = useState<BlueprintEstimatorInput>(ESTIMATOR_DEFAULTS);

  const report = useMemo(() => runBlueprintEstimate(spec), [spec]);
  const specKey = useMemo(() => JSON.stringify(spec), [spec]);

  const [scenarioId, setScenarioId] = useState<PublicScenarioId>(PUBLIC_SCENARIO_IDS[0]);
  const [runState, setRunState] = useState<{ result: ScenarioRunResult; specKey: string } | null>(
    null,
  );
  const runResult = runState?.result ?? null;
  const runIsStale = runState !== null && runState.specKey !== specKey;

  const handleRunScenario = () => {
    const result = runPublicScenario(scenarioId, spec, report);
    if (result) setRunState({ result, specKey });
  };

  const setNumber = (key: keyof BlueprintEstimatorInput) => (raw: string) => {
    const parsed = Number(raw);
    setSpec((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }));
  };


  const kpis = [
    {
      label: t('blueprintTool.kpiPue'),
      value: report.pue.toFixed(2),
      note: t('blueprintTool.kpiPueNote', { baseline: report.baselinePue.toFixed(2) }),
    },
    {
      label: t('blueprintTool.kpiCarbon'),
      value: `${numberFormat(report.annualTonnesCo2e, 1)} t`,
      note: t('blueprintTool.kpiCarbonNote', {
        intensity: report.gridIntensityGPerKwh,
        renewable: report.gridRenewablePct,
      }),
    },
    {
      label: t('blueprintTool.kpiCost'),
      value: currency(report.annualTotalCost),
      note: t('blueprintTool.kpiCostNote', { perMwh: numberFormat(report.costPerItMwh, 2) }),
    },
    {
      label: t('blueprintTool.kpiEnergy'),
      value: `${numberFormat(report.annualFacilityMwh)} MWh`,
      note: t('blueprintTool.kpiEnergyNote', { it: numberFormat(report.annualItMwh) }),
    },
  ];

  const costRows = [
    { label: t('blueprintTool.costEnergy'), value: report.annualEnergyCost },
    { label: t('blueprintTool.costCarbon'), value: report.annualCarbonCost },
    { label: t('blueprintTool.costMaintenance'), value: report.annualMaintenanceCost },
    { label: t('blueprintTool.costCapex'), value: report.annualAmortisedCapex },
  ];

  return (
    <>
      <Helmet>
        <title>{t('blueprintTool.metaTitle')}</title>
        <meta name="description" content={t('blueprintTool.metaDescription')} />
        <link rel="canonical" href="https://auradc.m2mtechconnect.com/blueprint-estimator" />
        <meta property="og:title" content={t('blueprintTool.metaTitle')} />
        <meta property="og:description" content={t('blueprintTool.metaDescription')} />
        <meta property="og:url" content="https://auradc.m2mtechconnect.com/blueprint-estimator" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="aura-marketing flex min-h-screen flex-col bg-[#0A0A0A]">
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 lg:px-8">
            <Link
              to="/"
              className="flex items-center gap-2 text-sm text-[#AEB4BC] transition-colors hover:text-[#F5F7FA]"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <AuraLogo
                surface="dark"
                variant="stacked"
                showParentBrand={false}
                tagline="Blueprint Estimator"
              />
            </Link>
            <Link
              to="/architecture"
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#AEB4BC] transition-colors hover:text-[#F5F7FA]"
            >
              {t('blueprintTool.architectureLink')}
            </Link>
          </div>
        </header>

        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 pt-14 lg:px-8 lg:pt-20">
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
              {t('blueprintTool.eyebrow')}
            </span>
            <h1 className="mt-4 max-w-4xl font-display text-[clamp(2rem,5vw,3.5rem)] font-bold uppercase leading-[0.95] tracking-tight text-[#F5F7FA]">
              {t('blueprintTool.title')}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-[#C9CDD3]">
              {t('blueprintTool.intro')}
            </p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-success">
              {t('blueprintTool.provenance')}
            </p>
          </div>

          <div className="mx-auto mt-12 grid min-w-0 max-w-7xl gap-px border border-[#3A3A3A] bg-[#3A3A3A] px-0 lg:mt-16 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            {/* Spec form */}
            <form
              className="min-w-0 bg-[#111112] p-6 lg:p-8"
              onSubmit={(event) => event.preventDefault()}
              aria-label={t('blueprintTool.formLabel')}
            >
              <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-[#F5F7FA]">
                {t('blueprintTool.formTitle')}
              </h2>
              <p className="mt-2 text-sm text-[#AEB4BC]">{t('blueprintTool.formHint')}</p>

              <div className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="itLoadMw" className={labelClass}>
                    {t('blueprintTool.fieldItLoad')}
                  </Label>
                  <Input
                    id="itLoadMw"
                    type="number"
                    min={0}
                    step={0.5}
                    className={fieldClass}
                    value={spec.itLoadMw}
                    onChange={(event) => setNumber('itLoadMw')(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rackDensityKw" className={labelClass}>
                    {t('blueprintTool.fieldDensity')}
                  </Label>
                  <Input
                    id="rackDensityKw"
                    type="number"
                    min={1}
                    step={1}
                    className={fieldClass}
                    value={spec.rackDensityKw}
                    onChange={(event) => setNumber('rackDensityKw')(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="utilisationPct" className={labelClass}>
                    {t('blueprintTool.fieldUtilisation')}
                  </Label>
                  <Input
                    id="utilisationPct"
                    type="number"
                    min={5}
                    max={100}
                    step={1}
                    className={fieldClass}
                    value={spec.utilisationPct}
                    onChange={(event) => setNumber('utilisationPct')(event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coolingTopology" className={labelClass}>
                    {t('blueprintTool.fieldCooling')}
                  </Label>
                  <select
                    id="coolingTopology"
                    className={selectClass}
                    value={spec.coolingTopology}
                    onChange={(event) =>
                      setSpec((current) => ({
                        ...current,
                        coolingTopology: event.target.value as CoolingTopology,
                      }))
                    }
                  >
                    {COOLING_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`blueprintTool.cooling.${option}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="climate" className={labelClass}>
                    {t('blueprintTool.fieldClimate')}
                  </Label>
                  <select
                    id="climate"
                    className={selectClass}
                    value={spec.climate}
                    onChange={(event) =>
                      setSpec((current) => ({
                        ...current,
                        climate: event.target.value as ClimateBand,
                      }))
                    }
                  >
                    {CLIMATE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {t(`blueprintTool.climate.${option}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="region" className={labelClass}>
                    {t('blueprintTool.fieldRegion')}
                  </Label>
                  <select
                    id="region"
                    className={selectClass}
                    value={spec.region}
                    onChange={(event) =>
                      setSpec((current) => ({ ...current, region: event.target.value }))
                    }
                  >
                    {REGION_KEYS.map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="electricityPricePerKwh" className={labelClass}>
                      {t('blueprintTool.fieldPrice')}
                    </Label>
                    <Input
                      id="electricityPricePerKwh"
                      type="number"
                      min={0}
                      step={0.001}
                      className={fieldClass}
                      value={spec.electricityPricePerKwh}
                      onChange={(event) => setNumber('electricityPricePerKwh')(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carbonPricePerTonne" className={labelClass}>
                      {t('blueprintTool.fieldCarbonPrice')}
                    </Label>
                    <Input
                      id="carbonPricePerTonne"
                      type="number"
                      min={0}
                      step={5}
                      className={fieldClass}
                      value={spec.carbonPricePerTonne}
                      onChange={(event) => setNumber('carbonPricePerTonne')(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="capexPerMw" className={labelClass}>
                      {t('blueprintTool.fieldCapex')}
                    </Label>
                    <Input
                      id="capexPerMw"
                      type="number"
                      min={0}
                      step={500000}
                      className={fieldClass}
                      value={spec.capexPerMw}
                      onChange={(event) => setNumber('capexPerMw')(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amortisationYears" className={labelClass}>
                      {t('blueprintTool.fieldAmortisation')}
                    </Label>
                    <Input
                      id="amortisationYears"
                      type="number"
                      min={1}
                      max={40}
                      step={1}
                      className={fieldClass}
                      value={spec.amortisationYears}
                      onChange={(event) => setNumber('amortisationYears')(event.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSpec(ESTIMATOR_DEFAULTS)}
                  className="h-11 w-full gap-2 rounded-none border-white/20 bg-transparent text-xs font-semibold uppercase tracking-[0.16em] text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5F7FA]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  {t('blueprintTool.reset')}
                </Button>
              </div>
            </form>

            {/* Report */}
            <section className="min-w-0 bg-[#161617] p-6 lg:p-10" aria-live="polite">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="font-display text-lg font-semibold uppercase tracking-wide text-[#F5F7FA]">
                  {t('blueprintTool.reportTitle')}
                </h2>
                <span className="border border-success/40 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-success">
                  {t('blueprintTool.simulatedTag')}
                </span>
              </div>

              <div className="mt-8 grid gap-px border border-[#3A3A3A] bg-[#3A3A3A] sm:grid-cols-2">
                {kpis.map((kpi) => (
                  <div key={kpi.label} className="bg-[#0F0F10] p-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#AEB4BC]">
                      {kpi.label}
                    </p>
                    <p className="mt-3 font-mono text-3xl font-bold text-[#F5F7FA]">{kpi.value}</p>
                    <p className="mt-2 text-xs leading-relaxed text-[#AEB4BC]">{kpi.note}</p>
                  </div>
                ))}
              </div>

              <Accordion type="single" collapsible defaultValue="pue-detail" className="mt-10 border-t border-[#3A3A3A]">
                <AccordionItem value="pue-detail" className="border-[#3A3A3A]">
                  <AccordionTrigger className="min-h-14 text-left text-xs font-semibold uppercase tracking-[0.2em] text-success hover:no-underline">
                    {t('blueprintTool.pueBreakdownTitle')}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <table className="w-full table-fixed border-collapse text-sm">
                      <caption className="sr-only">{t('blueprintTool.pueBreakdownTitle')}</caption>
                      <tbody>
                        {report.pueContributions.map((row) => (
                          <tr key={row.label} className="border-b border-white/10">
                            <th scope="row" className="py-2 pr-4 text-left font-normal text-[#C9CDD3]">
                              {t(`blueprintTool.pueRow.${row.label}`)}
                            </th>
                            <td className="w-24 py-2 text-right font-mono text-[#F5F7FA]">
                              {row.value >= 0 && row.label !== 'cooling' ? '+' : ''}{row.value.toFixed(3)}
                            </td>
                          </tr>
                        ))}
                        <tr>
                          <th scope="row" className="py-3 text-left font-semibold text-[#F5F7FA]">{t('blueprintTool.pueRow.total')}</th>
                          <td className="py-3 text-right font-mono font-bold text-success">{report.pue.toFixed(3)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="cost-detail" className="border-[#3A3A3A]">
                  <AccordionTrigger className="min-h-14 text-left text-xs font-semibold uppercase tracking-[0.2em] text-success hover:no-underline">
                    {t('blueprintTool.costBreakdownTitle')}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <table className="w-full table-fixed border-collapse text-sm">
                      <caption className="sr-only">{t('blueprintTool.costBreakdownTitle')}</caption>
                      <tbody>
                        {costRows.map((row) => (
                          <tr key={row.label} className="border-b border-white/10">
                            <th scope="row" className="py-2 pr-4 text-left font-normal text-[#C9CDD3]">{row.label}</th>
                            <td className="w-28 py-2 text-right font-mono text-[#F5F7FA]">{numberFormat(row.value)}</td>
                          </tr>
                        ))}
                        <tr>
                          <th scope="row" className="py-3 text-left font-semibold text-[#F5F7FA]">{t('blueprintTool.costTotal')}</th>
                          <td className="py-3 text-right font-mono font-bold text-success">{numberFormat(report.annualTotalCost)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="comparison-detail" className="border-[#3A3A3A]">
                  <AccordionTrigger className="min-h-14 text-left text-xs font-semibold uppercase tracking-[0.2em] text-success hover:no-underline">
                    {t('blueprintTool.compareTitle', { baseline: report.baselinePue.toFixed(2) })}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <div className="grid gap-6 sm:grid-cols-3">
                      <div>
                        <p className="font-mono text-2xl font-bold text-[#F5F7FA]">{numberFormat(report.annualEnergySavedMwh)} MWh</p>
                        <p className="mt-1 text-xs text-[#AEB4BC]">{t('blueprintTool.compareEnergy')}</p>
                      </div>
                      <div>
                        <p className="font-mono text-2xl font-bold text-[#F5F7FA]">{currency(report.annualCostSaved)}</p>
                        <p className="mt-1 text-xs text-[#AEB4BC]">{t('blueprintTool.compareCost')}</p>
                      </div>
                      <div>
                        <p className="font-mono text-2xl font-bold text-[#F5F7FA]">{numberFormat(report.annualTonnesSaved, 1)} t</p>
                        <p className="mt-1 text-xs text-[#AEB4BC]">{t('blueprintTool.compareCarbon')}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              {/* Scenario run through the AURA simulation engine */}
              <div className="mt-10 border border-[#3A3A3A] bg-[#0F0F10] p-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-success">
                  {t('blueprintTool.scenario.title')}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#C9CDD3]">
                  {t('blueprintTool.scenario.intro')}
                </p>

                <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label={t('blueprintTool.scenario.pickLabel')}>
                  {PUBLIC_SCENARIO_IDS.map((id) => {
                    const active = id === scenarioId;
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setScenarioId(id)}
                        className={`rounded-none border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
                          active
                            ? 'border-success bg-success/15 text-success'
                            : 'border-white/20 text-[#C9CDD3] hover:border-white/40 hover:text-[#F5F7FA]'
                        }`}
                      >
                        {t(`blueprintTool.scenario.names.${id}`)}
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={handleRunScenario}
                  className="mt-6 h-12 rounded-none bg-success px-8 text-sm font-bold uppercase tracking-[0.16em] text-[#0A0A0A] hover:bg-success/90"
                >
                  {t('blueprintTool.scenario.runCta')}
                </Button>

                {runResult === null ? (
                  <p className="mt-6 text-sm text-[#AEB4BC]">{t('blueprintTool.scenario.idle')}</p>
                ) : (
                  <div className="mt-8">
                    {runIsStale && (
                      <p className="mb-6 border border-warning/40 bg-warning/10 p-3 text-xs uppercase tracking-[0.14em] text-warning">
                        {t('blueprintTool.scenario.stale')}
                      </p>
                    )}
                    <p className="font-mono text-xs uppercase tracking-[0.18em] text-[#AEB4BC]">
                      {t('blueprintTool.scenario.runMeta', {
                        name: t(`blueprintTool.scenario.names.${runResult.scenarioId}`),
                        minutes: Math.round(runResult.durationSeconds / 60),
                        events: runResult.events.length,
                      })}
                    </p>

                    <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <p className="font-mono text-2xl font-bold text-[#F5F7FA]">
                          {runResult.peakPue.toFixed(2)}
                        </p>
                        <p className="mt-1 text-xs text-[#AEB4BC]">
                          {t('blueprintTool.scenario.peakPue', {
                            design: runResult.designPue.toFixed(2),
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-2xl font-bold text-[#F5F7FA]">
                          {numberFormat(runResult.peakOverheadKw)} kW
                        </p>
                        <p className="mt-1 text-xs text-[#AEB4BC]">
                          {t('blueprintTool.scenario.peakOverhead')}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-2xl font-bold text-[#F5F7FA]">
                          {numberFormat(runResult.peakOverheadCostPerHour, 2)}
                        </p>
                        <p className="mt-1 text-xs text-[#AEB4BC]">
                          {t('blueprintTool.scenario.peakCost', {
                            carbon: numberFormat(runResult.peakOverheadKgCo2ePerHour, 2),
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-2xl font-bold text-[#F5F7FA]">
                          {runResult.lowestThermalStability.toFixed(0)}
                        </p>
                        <p className="mt-1 text-xs text-[#AEB4BC]">
                          {t('blueprintTool.scenario.lowestThermal', {
                            cooling: runResult.lowestCoolingEfficiency.toFixed(0),
                          })}
                        </p>
                      </div>
                    </div>

                    <Accordion type="single" collapsible className="mt-7 border-t border-[#3A3A3A]">
                      <AccordionItem value="scenario-timeline" className="border-[#3A3A3A]">
                        <AccordionTrigger className="min-h-14 text-left text-xs font-semibold uppercase tracking-[0.2em] text-success hover:no-underline">
                          {t('blueprintTool.scenario.timelineTitle')}
                        </AccordionTrigger>
                        <AccordionContent className="pb-6">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[34rem] border-collapse text-sm">
                              <caption className="sr-only">{t('blueprintTool.scenario.timelineTitle')}</caption>
                              <thead>
                                <tr className="border-b border-white/15 text-left text-xs uppercase tracking-[0.14em] text-[#AEB4BC]">
                                  <th scope="col" className="py-2 font-semibold">{t('blueprintTool.scenario.colTime')}</th>
                                  <th scope="col" className="py-2 font-semibold">{t('blueprintTool.scenario.colEvent')}</th>
                                  <th scope="col" className="py-2 text-right font-semibold">{t('blueprintTool.scenario.colPue')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {runResult.events.map((event) => (
                                  <tr key={event.id} className="border-b border-white/10 align-top">
                                    <td className="py-2 pr-4 font-mono text-xs text-[#AEB4BC]">
                                      {`${String(Math.floor(event.at / 60)).padStart(2, '0')}:${String(event.at % 60).padStart(2, '0')}`}
                                    </td>
                                    <td className="py-2 pr-4">
                                      <span className="text-[#F5F7FA]">{event.title}</span>
                                      <span className="block text-xs text-[#AEB4BC]">{event.description}</span>
                                    </td>
                                    <td className={`py-2 text-right font-mono ${event.pue > runResult.designPue ? 'text-warning' : 'text-[#F5F7FA]'}`}>
                                      {event.pue.toFixed(3)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <p className="mt-5 font-mono text-xs uppercase tracking-[0.18em] text-[#AEB4BC]">{t('blueprintTool.scenario.provenance')}</p>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}
              </div>

              <Accordion type="single" collapsible className="mt-8 border-t border-[#3A3A3A]">
                <AccordionItem value="assumptions" className="border-[#3A3A3A]">
                  <AccordionTrigger className="min-h-14 text-left text-xs font-semibold uppercase tracking-[0.2em] text-success hover:no-underline">
                    {t('blueprintTool.assumptionsTitle')}
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <ul className="space-y-2 text-sm leading-relaxed text-[#C9CDD3]">
                      {['a1', 'a2', 'a3', 'a4', 'a5'].map((key) => (
                        <li key={key} className="border-l border-[#3A3A3A] pl-4">{t(`blueprintTool.assumption.${key}`)}</li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

              <BlueprintLeadForm spec={spec} report={report} run={runIsStale ? null : runResult} />

              <p className="mt-8 border-t border-[#3A3A3A] pt-6 font-mono text-xs uppercase tracking-[0.18em] text-[#AEB4BC]">
                {t('blueprintTool.truthNote')}
              </p>

              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  asChild
                  className="h-14 rounded-none bg-accent px-8 text-sm font-bold uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
                >
                  <Link to="/sign-up">
                    {t('blueprintTool.ctaPrimary')}
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="h-14 rounded-none border-white/20 bg-transparent px-8 text-sm font-bold uppercase tracking-[0.16em] text-[#F5F7FA] hover:bg-white/5 hover:text-[#F5F7FA]"
                >
                  <Link to="/request-demo">{t('blueprintTool.ctaSecondary')}</Link>
                </Button>
              </div>
            </section>
          </div>

          <div className="h-20" />
        </main>

        <TwinFooter />
      </div>
    </>
  );
}
