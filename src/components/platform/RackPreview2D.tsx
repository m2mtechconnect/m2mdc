/**
 * RackPreview2D — Realistic 2D server pod / rack-front visualization.
 * Renders compute (GPU) and storage nodes as flat rack units with
 * drive bays, status LEDs, ventilation grilles, and inline model labels.
 * Dynamically updates based on wizard inputs (scenario + capacity).
 */
import React, { useMemo } from "react";
import { cn } from "@/lib/utils";

export interface RackUnitInfo {
  id: string;
  label: string;
  type: "compute" | "storage";
  specs: Record<string, string>;
}

interface RackPreview2DProps {
  computeNodes: number;
  storageNodes: number;
  ddnProduct: string | null;
}

/* ── GPU model assignment by index ─────────────────────── */
// Realistic mixed fleet: B200 for training, RTX PRO 6000 for inference, H100 for general
const GPU_MODELS = [
  { name: "B200", tag: "B200", color: "hsl(142 71% 45%)" },        // Training
  { name: "RTX PRO 6000", tag: "RTX6000", color: "hsl(217 91% 60%)" }, // Inference
  { name: "H100 SXM", tag: "H100", color: "hsl(280 67% 55%)" },     // HPC
] as const;

function getGpuModel(index: number, total: number) {
  // First ~60% B200 (training), next ~30% RTX PRO 6000 (inference), rest H100
  const trainingCount = Math.max(1, Math.ceil(total * 0.6));
  const inferCount = Math.max(0, Math.ceil(total * 0.3));
  if (index < trainingCount) return GPU_MODELS[0];
  if (index < trainingCount + inferCount) return GPU_MODELS[1];
  return GPU_MODELS[2];
}

/* ── Storage product labels ──────────────────────────────── */
const STORAGE_LABELS: Record<string, { tag: string; detail: string }> = {
  a3i_tlc: { tag: "A³I TLC", detail: "NVMe 184TB" },
  a3i_qlc: { tag: "A³I QLC", detail: "NVMe 368TB" },
  infinia: { tag: "INFINIA", detail: "2PB Multi" },
  exascaler: { tag: "EXAScaler", detail: "Lustre 10PB" },
  default: { tag: "DDN", detail: "NVMe 184TB" },
};

/* ── LED indicator ──────────────────────────────────────── */
function StatusLED({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span
      className={cn("inline-block rounded-full shrink-0", pulse && "animate-pulse")}
      style={{
        width: 5, height: 5,
        background: color,
        boxShadow: `0 0 4px ${color}, 0 0 8px ${color}40`,
      }}
    />
  );
}

/* ── Drive bay grid (for storage nodes) ─────────────────── */
function DriveBays({ count }: { count: number }) {
  return (
    <div className="flex gap-px flex-wrap" style={{ maxWidth: 60 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1px]"
          style={{
            width: 5, height: 8,
            background: "hsl(var(--muted-foreground) / 0.2)",
            border: "1px solid hsl(var(--muted-foreground) / 0.1)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Ventilation grille ─────────────────────────────────── */
function Grille() {
  return (
    <div className="flex gap-[1px] items-center shrink-0">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[0.5px]"
          style={{
            width: 1.5, height: 12,
            background: "hsl(var(--muted-foreground) / 0.15)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Single Rack Unit row ───────────────────────────────── */
function RackUnit2D({
  label, type, modelTag, modelColor,
}: {
  label: string;
  type: "compute" | "storage";
  modelTag: string;
  modelColor: string;
}) {
  const isCompute = type === "compute";

  return (
    <div
      className="relative flex items-center gap-1.5 px-2 py-1 border-b"
      style={{
        minHeight: isCompute ? 30 : 28,
        background: "hsl(var(--card))",
        borderColor: "hsl(var(--border) / 0.5)",
      }}
    >
      {/* Left edge accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-sm"
        style={{ background: modelColor }}
      />

      {/* LEDs */}
      <div className="flex flex-col gap-0.5 ml-1 shrink-0">
        <StatusLED color={isCompute ? "#22c55e" : "#f59e0b"} pulse />
        <StatusLED color="#3b82f6" />
      </div>

      {/* Grille */}
      <Grille />

      {/* Unit label */}
      <span
        className="text-[8px] font-mono font-bold uppercase tracking-wider shrink-0"
        style={{ color: "hsl(var(--foreground) / 0.8)" }}
      >
        {label}
      </span>

      {/* Model tag - inline annotation */}
      <span
        className="text-[7px] font-mono px-1 py-px rounded shrink-0"
        style={{
          background: `${modelColor}18`,
          color: modelColor,
          border: `1px solid ${modelColor}30`,
        }}
      >
        {modelTag}
      </span>

      <div className="flex-1" />

      {/* GPU indicators or drive bays */}
      {isCompute ? (
        <div className="flex gap-[2px] shrink-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-sm" style={{
              width: 6, height: 12,
              background: `${modelColor}${(50 + i * 20).toString(16)}`,
              border: `1px solid ${modelColor}30`,
            }} />
          ))}
        </div>
      ) : (
        <DriveBays count={10} />
      )}

      {/* Right edge ports */}
      <div className="flex flex-col gap-px shrink-0">
        <div className="rounded-[1px]" style={{ width: 6, height: 3, background: "hsl(var(--muted-foreground) / 0.2)" }} />
        <div className="rounded-[1px]" style={{ width: 6, height: 3, background: "hsl(var(--muted-foreground) / 0.2)" }} />
      </div>
    </div>
  );
}

/* ── Main rack component ────────────────────────────────── */
const RackPreview2D: React.FC<RackPreview2DProps> = ({
  computeNodes, storageNodes, ddnProduct,
}) => {
  const storageInfo = useMemo(() =>
    STORAGE_LABELS[ddnProduct ?? "default"] ?? STORAGE_LABELS.default,
    [ddnProduct]
  );

  const totalUnits = computeNodes + storageNodes;
  const displayTotal = Math.max(totalUnits, 4);
  const emptySlots = displayTotal - totalUnits;
  const rackU = totalUnits * 2 + 6;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 overflow-y-auto relative mx-2 my-2">
        <div
          className="rounded-md overflow-hidden"
          style={{
            border: "2px solid hsl(var(--muted-foreground) / 0.2)",
            background: "hsl(var(--card) / 0.5)",
            boxShadow: "inset 0 1px 0 hsl(var(--muted-foreground) / 0.05), 0 4px 20px hsl(0 0% 0% / 0.2)",
          }}
        >
          {/* Rack header */}
          <div
            className="flex items-center justify-between px-3 py-1.5"
            style={{
              background: "hsl(var(--muted) / 0.6)",
              borderBottom: "1px solid hsl(var(--border) / 0.5)",
            }}
          >
            <span className="text-[8px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
              RACK-01 · {rackU}U
            </span>
            <div className="flex items-center gap-2">
              <StatusLED color="#22c55e" />
              <span className="text-[7px] font-mono text-muted-foreground">PWR OK</span>
            </div>
          </div>

          {/* Rail markers + units */}
          <div className="relative">
            {/* Left rail */}
            <div
              className="absolute left-0 top-0 bottom-0 w-3.5 z-10 flex flex-col"
              style={{
                background: "hsl(var(--muted) / 0.4)",
                borderRight: "1px solid hsl(var(--border) / 0.3)",
              }}
            >
              {Array.from({ length: displayTotal }).map((_, i) => (
                <div key={i} className="flex-1 flex items-center justify-center"
                  style={{ borderBottom: "1px solid hsl(var(--border) / 0.15)", minHeight: 28 }}>
                  <span className="text-[6px] font-mono text-muted-foreground/50">{i + 1}</span>
                </div>
              ))}
            </div>

            {/* Right rail */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 z-10"
              style={{
                background: "hsl(var(--muted) / 0.4)",
                borderLeft: "1px solid hsl(var(--border) / 0.3)",
              }}
            />

            {/* Units */}
            <div className="ml-3.5 mr-2">
              {Array.from({ length: computeNodes }).map((_, i) => {
                const model = getGpuModel(i, computeNodes);
                return (
                  <RackUnit2D
                    key={`gpu-${i}`}
                    label={`GPU-${i}`}
                    type="compute"
                    modelTag={model.tag}
                    modelColor={model.color}
                  />
                );
              })}

              {Array.from({ length: storageNodes }).map((_, i) => (
                <RackUnit2D
                  key={`sto-${i}`}
                  label={`STORAGE-${i}`}
                  type="storage"
                  modelTag={storageInfo.tag}
                  modelColor="hsl(var(--warning))"
                />
              ))}

              {/* Empty slots */}
              {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center border-b"
                  style={{
                    minHeight: 24,
                    background: "hsl(var(--muted) / 0.1)",
                    borderColor: "hsl(var(--border) / 0.3)",
                  }}
                >
                  <span className="text-[7px] font-mono text-muted-foreground/30">— EMPTY —</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rack footer */}
          <div
            className="flex items-center justify-between px-3 py-1"
            style={{
              background: "hsl(var(--muted) / 0.4)",
              borderTop: "1px solid hsl(var(--border) / 0.3)",
            }}
          >
            <span className="text-[7px] font-mono text-muted-foreground/50">
              {computeNodes} GPU · {storageNodes} STR
            </span>
            <span className="text-[7px] font-mono text-muted-foreground/50">42V DC</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RackPreview2D;
// Keep legacy exports for compatibility
export { RackPreview2D };
export type { RackPreview2DProps };
