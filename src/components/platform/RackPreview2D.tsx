/**
 * RackPreview2D — Realistic 2D server pod / rack-front visualization.
 * Renders compute (GPU) and storage nodes as flat rack units with
 * drive bays, status LEDs, ventilation grilles, and click-to-select.
 * Dynamically updates based on wizard inputs.
 */
import React, { useState, useCallback, useMemo } from "react";
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
  selectedUnit?: string | null;
  onSelectUnit?: (unit: RackUnitInfo | null) => void;
}

/* ── Spec data ──────────────────────────────────────────── */
const COMPUTE_SPECS = [
  { gpu: "NVIDIA B3100", mem: "192 GB HBM3e", tflops: "2,500 TFLOPS", tdp: "700W", bw: "8.0 TB/s" },
  { gpu: "NVIDIA B3100", mem: "192 GB HBM3e", tflops: "2,500 TFLOPS", tdp: "700W", bw: "8.0 TB/s" },
  { gpu: "RTX PRO 6000", mem: "48 GB GDDR7", tflops: "1,400 TFLOPS", tdp: "350W", bw: "1.5 TB/s" },
  { gpu: "RTX PRO 6000", mem: "48 GB GDDR7", tflops: "1,400 TFLOPS", tdp: "350W", bw: "1.5 TB/s" },
  { gpu: "NVIDIA B3100", mem: "192 GB HBM3e", tflops: "2,500 TFLOPS", tdp: "700W", bw: "8.0 TB/s" },
  { gpu: "RTX PRO 6000", mem: "48 GB GDDR7", tflops: "1,400 TFLOPS", tdp: "350W", bw: "1.5 TB/s" },
  { gpu: "NVIDIA B3100", mem: "192 GB HBM3e", tflops: "2,500 TFLOPS", tdp: "700W", bw: "8.0 TB/s" },
  { gpu: "NVIDIA B3100", mem: "192 GB HBM3e", tflops: "2,500 TFLOPS", tdp: "700W", bw: "8.0 TB/s" },
];

const STORAGE_SPECS: Record<string, { capacity: string; throughput: string; iops: string; protocol: string }> = {
  a3i_tlc: { capacity: "184 TB NVMe TLC", throughput: "120 GB/s", iops: "40M IOPS", protocol: "NVMe-oF / GPUDirect" },
  a3i_qlc: { capacity: "368 TB NVMe QLC", throughput: "90 GB/s", iops: "20M IOPS", protocol: "NVMe-oF / GPUDirect" },
  infinia: { capacity: "2 PB", throughput: "200 GB/s", iops: "100M IOPS", protocol: "Multi-protocol" },
  exascaler: { capacity: "10 PB Lustre", throughput: "1 TB/s", iops: "50M IOPS", protocol: "Lustre / POSIX" },
  default: { capacity: "184 TB", throughput: "100 GB/s", iops: "30M IOPS", protocol: "NVMe-oF" },
};

const COMPUTE_DETAILS: Record<string, Record<string, string>> = {
  "NVIDIA B3100": { Architecture: "Blackwell", "CUDA Cores": "22,528", "Tensor Cores": "704", NVLink: "1.8 TB/s", PCIe: "Gen6 x16", "FP8 Perf": "5,000 TFLOPS" },
  "RTX PRO 6000": { Architecture: "Ada Lovelace", "CUDA Cores": "18,176", "Tensor Cores": "568", NVLink: "N/A", PCIe: "Gen4 x16", "FP8 Perf": "1,452 TFLOPS" },
};

const STORAGE_DETAILS: Record<string, Record<string, string>> = {
  a3i_tlc: { "Form Factor": "2U", "Drive Type": "NVMe TLC SSD", "Max Drives": "24", RAID: "Distributed RAID", Encryption: "AES-256", HA: "Active-Active" },
  a3i_qlc: { "Form Factor": "2U", "Drive Type": "NVMe QLC SSD", "Max Drives": "24", RAID: "Distributed RAID", Encryption: "AES-256", HA: "Active-Active" },
  infinia: { "Form Factor": "4U", "Drive Type": "Mixed Flash", Protocols: "NFS/SMB/S3/POSIX", "Multi-Tenant": "Yes", Encryption: "AES-256", HA: "Active-Active" },
  exascaler: { "Form Factor": "Rack-Scale", "File System": "Lustre", Protocols: "POSIX / MPI-IO", "Burst Buffer": "Integrated", Encryption: "AES-256", HA: "Active-Active" },
  default: { "Form Factor": "2U", "Drive Type": "NVMe SSD", "Max Drives": "24", RAID: "Distributed RAID", Encryption: "AES-256", HA: "Active-Active" },
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
    <div className="flex gap-px flex-wrap" style={{ maxWidth: 80 }}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-[1px]"
          style={{
            width: 6, height: 10,
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
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="rounded-[0.5px]"
          style={{
            width: 1.5, height: 14,
            background: "hsl(var(--muted-foreground) / 0.15)",
          }}
        />
      ))}
    </div>
  );
}

/* ── Single Rack Unit row ───────────────────────────────── */
function RackUnit2D({
  unitId, label, type, specs, selected, onSelect, hovered, onHover,
}: {
  unitId: string;
  label: string;
  type: "compute" | "storage";
  specs: Record<string, string>;
  selected: boolean;
  onSelect: (info: RackUnitInfo) => void;
  hovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const isCompute = type === "compute";
  const accentColor = isCompute ? "hsl(var(--primary))" : "hsl(var(--warning))";

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 px-2 py-1 cursor-pointer transition-all duration-150 group",
        "border-b",
        selected && "ring-1 ring-inset",
        hovered && !selected && "brightness-125",
      )}
      style={{
        minHeight: isCompute ? 36 : 32,
        background: selected
          ? `color-mix(in srgb, ${accentColor} 12%, hsl(var(--card)))`
          : hovered
            ? "hsl(var(--muted) / 0.5)"
            : "hsl(var(--card))",
        borderColor: selected ? accentColor : "hsl(var(--border) / 0.5)",
        ...(selected ? { ringColor: accentColor } : {}),
      }}
      onClick={() => onSelect({ id: unitId, label, type, specs })}
      onMouseEnter={() => onHover(unitId)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Left edge accent */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-sm"
        style={{ background: selected ? accentColor : "hsl(var(--muted-foreground) / 0.15)" }}
      />

      {/* LEDs */}
      <div className="flex flex-col gap-1 ml-1 shrink-0">
        <StatusLED color={isCompute ? "#22c55e" : "#f59e0b"} pulse />
        <StatusLED color="#3b82f6" />
      </div>

      {/* Grille */}
      <Grille />

      {/* Unit info */}
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span
          className="text-[9px] font-mono font-bold uppercase tracking-wider truncate"
          style={{ color: selected ? accentColor : "hsl(var(--foreground) / 0.8)" }}
        >
          {label}
        </span>
        {isCompute && (
          <span className="text-[8px] font-mono px-1 py-px rounded shrink-0"
            style={{ background: "hsl(var(--muted))", color: "hsl(var(--muted-foreground))" }}>
            GPU
          </span>
        )}
      </div>

      {/* Drive bays for storage, GPU indicators for compute */}
      {isCompute ? (
        <div className="flex gap-[2px] shrink-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-sm" style={{
              width: 8, height: 16,
              background: `hsl(var(--primary) / ${0.3 + i * 0.15})`,
              border: "1px solid hsl(var(--primary) / 0.2)",
            }} />
          ))}
        </div>
      ) : (
        <DriveBays count={12} />
      )}

      {/* Right edge ports */}
      <div className="flex flex-col gap-px shrink-0">
        <div className="rounded-[1px]" style={{ width: 8, height: 4, background: "hsl(var(--muted-foreground) / 0.2)" }} />
        <div className="rounded-[1px]" style={{ width: 8, height: 4, background: "hsl(var(--muted-foreground) / 0.2)" }} />
      </div>

      {/* Hover tooltip */}
      {hovered && !selected && (
        <div
          className="absolute z-50 left-full ml-2 top-1/2 -translate-y-1/2 rounded-lg shadow-xl"
          style={{
            background: "hsl(var(--popover))",
            border: "1px solid hsl(var(--border))",
            padding: "8px 12px", minWidth: 180,
            backdropFilter: "blur(8px)",
          }}
        >
          <div className="text-[10px] font-bold font-mono uppercase tracking-wider mb-1.5"
            style={{ color: accentColor }}>
            {label}
          </div>
          {Object.entries(specs).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 mb-0.5">
              <span className="text-[9px] font-mono text-muted-foreground capitalize">{k}</span>
              <span className="text-[9px] font-mono font-semibold text-foreground">{v}</span>
            </div>
          ))}
          <div className="text-[8px] font-mono text-muted-foreground text-center mt-1.5 opacity-50">Click to inspect</div>
        </div>
      )}
    </div>
  );
}

/* ── Detail panel (exported for wizard) ──────────────── */
export function RackDetailPanel({ unit, ddnProduct, onClose }: { unit: RackUnitInfo; ddnProduct: string | null; onClose: () => void }) {
  const extraSpecs = unit.type === "compute"
    ? COMPUTE_DETAILS[unit.specs.GPU] ?? {}
    : STORAGE_DETAILS[ddnProduct ?? "default"] ?? STORAGE_DETAILS.default;

  const accentColor = unit.type === "compute" ? "hsl(var(--primary))" : "hsl(var(--warning))";

  return (
    <div className="overflow-y-auto" style={{ borderTop: "1px solid hsl(var(--border))" }}>
      <div className="flex items-center justify-between px-4 py-2.5"
        style={{ background: `color-mix(in srgb, ${accentColor} 6%, transparent)` }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
          <span className="text-[11px] font-bold font-mono uppercase tracking-wider" style={{ color: accentColor }}>
            {unit.label}
          </span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {unit.type === "compute" ? "GPU Node" : "Storage Node"}
          </span>
        </div>
        <button onClick={onClose} className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors hover:bg-muted text-muted-foreground">
          ✕ Close
        </button>
      </div>

      <div className="px-4 py-2.5 space-y-1">
        <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">Primary Specs</p>
        {Object.entries(unit.specs).map(([k, v]) => (
          <div key={k} className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-muted-foreground">{k}</span>
            <span className="text-[10px] font-mono font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 space-y-1" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">Extended Details</p>
        {Object.entries(extraSpecs).map(([k, v]) => (
          <div key={k} className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-muted-foreground">{k}</span>
            <span className="text-[10px] font-mono font-semibold text-foreground">{v}</span>
          </div>
        ))}
      </div>

      <div className="px-4 py-2 flex items-center gap-4"
        style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted) / 0.3)" }}>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22c55e" }} />
          <span className="text-[9px] font-mono text-muted-foreground">Online</span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground">Temp: 42°C</span>
        <span className="text-[9px] font-mono text-muted-foreground">Util: 78%</span>
      </div>
    </div>
  );
}

/* ── Main rack component ────────────────────────────────── */
const RackPreview2D: React.FC<RackPreview2DProps> = ({
  computeNodes, storageNodes, ddnProduct, selectedUnit, onSelectUnit,
}) => {
  const [hoveredUnit, setHoveredUnit] = useState<string | null>(null);

  const productLabel = useMemo(() => {
    switch (ddnProduct) {
      case "a3i_tlc": return "A³I TLC";
      case "a3i_qlc": return "A³I QLC";
      case "infinia": return "INFINIA";
      case "exascaler": return "EXASCALER";
      default: return "STORAGE";
    }
  }, [ddnProduct]);

  const handleSelect = useCallback((info: RackUnitInfo) => {
    onSelectUnit?.(selectedUnit === info.id ? null : info);
  }, [selectedUnit, onSelectUnit]);

  const totalUnits = computeNodes + storageNodes;
  const displayTotal = Math.max(totalUnits, 6);
  const emptySlots = displayTotal - totalUnits;
  const rackU = totalUnits * 2 + 6;

  return (
    <div className="w-full h-full flex flex-col">
      {/* Rack frame */}
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
              className="absolute left-0 top-0 bottom-0 w-4 z-10 flex flex-col"
              style={{
                background: "hsl(var(--muted) / 0.4)",
                borderRight: "1px solid hsl(var(--border) / 0.3)",
              }}
            >
              {Array.from({ length: displayTotal }).map((_, i) => (
                <div key={i} className="flex-1 flex items-center justify-center"
                  style={{ borderBottom: "1px solid hsl(var(--border) / 0.15)", minHeight: 32 }}>
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
            <div className="ml-4 mr-2">
              {Array.from({ length: computeNodes }).map((_, i) => {
                const s = COMPUTE_SPECS[i % COMPUTE_SPECS.length];
                const id = `gpu-${i}`;
                return (
                  <RackUnit2D
                    key={id}
                    unitId={id}
                    label={`GPU-${i}`}
                    type="compute"
                    specs={{ GPU: s.gpu, Memory: s.mem, Perf: s.tflops, TDP: s.tdp, Bandwidth: s.bw }}
                    selected={selectedUnit === id}
                    onSelect={handleSelect}
                    hovered={hoveredUnit === id}
                    onHover={setHoveredUnit}
                  />
                );
              })}

              {Array.from({ length: storageNodes }).map((_, i) => {
                const s = STORAGE_SPECS[ddnProduct ?? "default"] ?? STORAGE_SPECS.default;
                const id = `sto-${i}`;
                return (
                  <RackUnit2D
                    key={id}
                    unitId={id}
                    label={`${productLabel}-${i}`}
                    type="storage"
                    specs={{ Capacity: s.capacity, Throughput: s.throughput, IOPS: s.iops, Protocol: s.protocol }}
                    selected={selectedUnit === id}
                    onSelect={handleSelect}
                    hovered={hoveredUnit === id}
                    onHover={setHoveredUnit}
                  />
                );
              })}

              {/* Empty slots */}
              {emptySlots > 0 && Array.from({ length: emptySlots }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="flex items-center justify-center border-b"
                  style={{
                    minHeight: 28,
                    background: "hsl(var(--muted) / 0.1)",
                    borderColor: "hsl(var(--border) / 0.3)",
                  }}
                >
                  <span className="text-[8px] font-mono text-muted-foreground/30 tracking-widest">— EMPTY —</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rack footer */}
          <div
            className="flex items-center justify-between px-3 py-1"
            style={{
              background: "hsl(var(--muted) / 0.4)",
              borderTop: "1px solid hsl(var(--border) / 0.5)",
            }}
          >
            <span className="text-[7px] font-mono text-muted-foreground/50">
              SN: RK-{new Date().getFullYear()}-{String(computeNodes + storageNodes).padStart(4, "0")}
            </span>
            <span className="text-[7px] font-mono text-muted-foreground/50">42V DC</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RackPreview2D;
