import { DataModeBadge, FreshnessIndicator } from '@/components/dsx/StateBadges';
import { formatReadingValue, readingsForAsset, type ResolvedReading } from './twinTelemetryApi';

interface Props {
  asset: { id: string; name?: string };
  readings: ResolvedReading[];
  /** True when the facility is a persisted record that can receive ingest. */
  facilityIsPersisted: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Observed readings for one modelled asset, shown beside its design values so
 * an operator can tell the two apart. Every row is cited back to the record
 * that produced it. When nothing has been ingested the section says so
 * plainly rather than filling the space with modelled numbers.
 */
export function AssetTelemetrySection({ asset, readings, facilityIsPersisted, isLoading, error }: Props) {
  const matched = readingsForAsset(readings, asset);

  return (
    <section aria-labelledby="asset-telemetry-heading" className="rounded-md border border-border p-2.5">
      <h4 id="asset-telemetry-heading" className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Observed telemetry
      </h4>

      {error ? (
        <p className="mt-1.5 text-xs text-destructive">Telemetry could not be read: {error}</p>
      ) : isLoading ? (
        <p className="mt-1.5 text-xs text-muted-foreground">Reading ingested values...</p>
      ) : !facilityIsPersisted ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          This is a reference facility. Only saved facilities can receive ingested telemetry.
        </p>
      ) : matched.length === 0 ? (
        <p className="mt-1.5 text-xs text-muted-foreground">
          No readings have been ingested for this asset. Values shown above are modelled design inputs.
        </p>
      ) : (
        <ul className="mt-1.5 space-y-1.5">
          {matched.map((reading) => (
            <li key={reading.id} className="rounded-md bg-muted/50 px-2.5 py-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-xs text-muted-foreground">{reading.targetProperty}</span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-foreground">
                  {formatReadingValue(reading)}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <DataModeBadge mode={reading.mode} />
                <FreshnessIndicator freshness={reading.freshness} />
                <span className="text-[11px] text-muted-foreground">{reading.modeReason}</span>
              </div>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                twin_property_values · {reading.id}
                {reading.sourceMessageId ? ` · message ${reading.sourceMessageId}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
