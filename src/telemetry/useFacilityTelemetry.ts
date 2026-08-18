import { useQuery } from '@tanstack/react-query';
import { fetchFacilityTelemetry, isFacilityRecordId } from './twinTelemetryApi';

/**
 * Reads persisted ingest readings for a facility. Disabled when the facility
 * id is not a persisted record, so a synthetic reference facility never
 * issues a query that could only fail.
 */
export function useFacilityTelemetry(facilityId: string | null | undefined) {
  return useQuery({
    queryKey: ['facility-telemetry', facilityId],
    queryFn: () => fetchFacilityTelemetry(facilityId),
    enabled: isFacilityRecordId(facilityId),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}
