/**
 * HotspotZonesList
 *
 * Step 3 of the decision-flow story: "Is demand creating risk?"
 *
 * Lists zones whose inlet temperature is approaching or exceeding the
 * ASHRAE TC 9.9 Class A1 recommended envelope (18-27 deg C, recommended
 * 18-24 deg C). Severity is derived from inlet temperature, not raw
 * incident count, so a quiet but hot zone is not falsely shown as healthy.
 */

import { Badge } from '@/components/ui/badge';
import { Thermometer, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HotspotZone {
  zone: string;
  inletTempC: number;
  events: number;
  /** event grain summary, used in subtitle */
  note?: string;
}

interface HotspotZonesListProps {
  zones: HotspotZone[];
  /** ASHRAE A1 recommended max inlet, default 24 deg C */
  warningTempC?: number;
  /** ASHRAE A1 allowable max, default 27 deg C */
  criticalTempC?: number;
}

function severity(temp: number, warn: number, crit: number) {
  if (temp >= crit) return { label: 'critical', cls: 'destructive' as const };
  if (temp >= warn) return { label: 'warning', cls: 'default' as const };
  return { label: 'normal', cls: 'secondary' as const };
}

export function HotspotZonesList({
  zones,
  warningTempC = 24,
  criticalTempC = 27,
}: HotspotZonesListProps) {
  const sorted = [...zones].sort((a, b) => b.inletTempC - a.inletTempC);

  return (
    <div className="space-y-2">
      {sorted.map((z) => {
        const sev = severity(z.inletTempC, warningTempC, criticalTempC);
        return (
          <div
            key={z.zone}
            className="flex items-center justify-between p-3 border border-border rounded-lg bg-card"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Thermometer
                className={cn(
                  'h-4 w-4 flex-shrink-0',
                  z.inletTempC >= criticalTempC
                    ? 'text-red-600'
                    : z.inletTempC >= warningTempC
                    ? 'text-amber-600'
                    : 'text-muted-foreground'
                )}
              />
              <div className="min-w-0">
                <div className="text-sm font-medium text-foreground truncate">
                  {z.zone}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Inlet {z.inletTempC.toFixed(1)} &deg;C
                  {' \u00b7 '}
                  {z.events} {z.events === 1 ? 'event' : 'events'}
                  {z.note ? ` \u00b7 ${z.note}` : ''}
                </div>
              </div>
            </div>
            <Badge variant={sev.cls} className="capitalize">
              {sev.label === 'critical' && (
                <AlertTriangle className="h-3 w-3 mr-1" />
              )}
              {sev.label}
            </Badge>
          </div>
        );
      })}
      <p className="text-[11px] text-muted-foreground pt-1">
        Thresholds: ASHRAE TC 9.9 Class A1 recommended {warningTempC} &deg;C,
        allowable {criticalTempC} &deg;C.
      </p>
    </div>
  );
}