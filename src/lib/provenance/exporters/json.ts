/**
 * Provenance-preserving JSON serializer.
 * Includes a schema version and separates observation time from
 * export-generation time.
 */

import type { ExportPayload } from './schema';
import { EXPORT_SCHEMA_VERSION } from './schema';

export interface SerializedJsonPayload {
  $schema: 'aura.export/v1';
  schemaVersion: typeof EXPORT_SCHEMA_VERSION;
  surface: string;
  title: string;
  generatedAt: string;
  note?: string;
  records: ExportPayload['records'];
}

export function toJson(payload: ExportPayload): string {
  const serialized: SerializedJsonPayload = {
    $schema: 'aura.export/v1',
    schemaVersion: EXPORT_SCHEMA_VERSION,
    surface: payload.surface,
    title: payload.title,
    generatedAt: payload.generatedAt,
    ...(payload.note ? { note: payload.note } : {}),
    records: payload.records,
  };
  return JSON.stringify(serialized, null, 2);
}