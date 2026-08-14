/**
 * AssetProvenancePanel
 *
 * Development-only proof of what the runtime actually mounted. Every value is
 * derived from the live asset-registry resolution - nothing is hardcoded.
 */

import { useMemo, useState } from 'react';
import {
  FALLBACK_REASON_LABEL,
  RACK_ASSET_ID,
  getAsset,
  resolveRuntimeAsset,
} from './assetRegistry';

export function AssetProvenanceBadge({ preferFallback }: { preferFallback?: boolean }) {
  const [open, setOpen] = useState(false);
  const resolution = useMemo(
    () => resolveRuntimeAsset(RACK_ASSET_ID, { preferFallback }),
    [preferFallback],
  );
  const entry = getAsset(RACK_ASSET_ID);
  const imported = resolution.glbUrl !== null;

  return (
    <div className="absolute bottom-3 right-3 z-10 max-w-[22rem] text-left" data-testid="asset-provenance">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-testid="asset-provenance-toggle"
        data-runtime-geometry={imported ? 'imported-glb' : 'procedural'}
        className="rounded-md border border-slate-600/70 bg-slate-900/85 px-2.5 py-1.5 text-xs text-slate-100 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
      >
        {imported ? 'Imported GLB asset' : 'Procedural 3D preview'}
      </button>

      {open && (
        <dl className="mt-2 space-y-1 rounded-md border border-slate-700/70 bg-slate-900/95 p-3 text-[12px] text-slate-200">
          <Row label="Runtime geometry" value={imported ? 'Imported GLB' : 'Procedural (Rack.tsx primitives)'} />
          <Row label="USD master" value={resolution.usdMasterPath ?? 'None'} />
          <Row label="USD checksum" value={resolution.usdChecksum ?? 'None'} />
          <Row label="GLB derivative" value={resolution.glbUrl ?? 'None'} />
          <Row label="GLB checksum" value={resolution.glbChecksum ?? 'None'} />
          <Row label="Validation" value={resolution.validatedAt ? `Passed ${resolution.validatedAt}` : 'Not run'} />
          <Row label="Approval" value={resolution.approvalStatus} />
          <Row label="Fallback active" value={imported ? 'No' : 'Yes'} />
          {resolution.fallbackReason && (
            <Row label="Reason" value={FALLBACK_REASON_LABEL[resolution.fallbackReason]} />
          )}
          {entry?.blocker && <Row label="Blocker" value={entry.blocker} />}
          <Row label="Licence basis" value={resolution.provenance.licence ?? 'Unknown'} />
        </dl>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words font-mono text-slate-100">{value}</dd>
    </div>
  );
}
