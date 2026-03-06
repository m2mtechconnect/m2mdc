/**
 * InfrastructurePage - Data Centre Infrastructure Management
 * Self-contained single-file component with 7 sections:
 * Hero CTA, How It Works strip, Operational Metrics, Operations,
 * Deployed Pods CRUD, Data Flow Pipeline, Pod Designer Wizard.
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, Cpu, Eye, Bot, Layers, ChevronRight, ChevronLeft, ChevronDown,
  ArrowDown, RotateCcw, Plus, Rocket, Save, X, Server, HardDrive,
  Activity, Zap, Clock, CheckCircle, AlertTriangle, MoreHorizontal,
  Pencil, Trash2, Thermometer, MemoryStick,
  Gauge, DollarSign, ShieldCheck, Box, Wifi, Link2,
} from "lucide-react";
import dcHeroVisual from "@/assets/dc-hero-visual.png";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

/* ═══════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════ */

// Stages
interface Stage {
  id: string; label: string; icon: React.ElementType; color: string;
  short: string; full: string; specs: string[];
}
const STAGES: Stage[] = [
  { id: "collect", label: "Collect", icon: Radio, color: "hsl(var(--accent-foreground))", short: "DDN ingests DCIM telemetry, BMS feeds, power/cooling sensor streams at high throughput.", full: "DDN A3I storage appliances ingest telemetry from DCIM platforms, Building Management Systems, and thousands of environmental sensors (temperature, humidity, power draw, airflow). Data arrives at wire speed via GPUDirect Storage, bypassing CPU bottlenecks entirely.", specs: ["DDN A3I TLC", "120 GB/s ingest", "NVMe-oF"] },
  { id: "train", label: "Train", icon: Cpu, color: "hsl(var(--warning))", short: "NVIDIA B3100 trains AI models for PUE optimization, capacity planning, and failure prediction.", full: "Blackwell B3100 GPU clusters train transformer and graph neural network models on historical facility data. Models learn PUE patterns, predict cooling failures 72 hours ahead, and optimize workload placement across racks. Training runs complete in under 4 hours on 8-GPU pods.", specs: ["B3100 x8", "FP8 inference", "72h lookahead"] },
  { id: "synthesize", label: "Synthesize", icon: Eye, color: "hsl(var(--success))", short: "RTX PRO 6000 creates a living 3D digital twin of racks, cooling, and power distribution.", full: "NVIDIA RTX PRO 6000 workstations render a photorealistic, physics-accurate 3D digital twin of the entire facility. Every rack, CRAH unit, PDU, and cable tray is modeled. The twin updates in real time as sensors stream new data, enabling operators to visualize thermal hotspots and airflow patterns.", specs: ["RTX PRO 6000", "Omniverse USD", "Real-time sync"] },
  { id: "act", label: "Act", icon: Bot, color: "hsl(var(--info))", short: "NVIDIA Jetson runs edge inference on each rack row for real-time thermal and power management.", full: "NVIDIA Jetson Orin modules deployed at the edge of each rack row execute lightweight inference models locally. They adjust fan speeds, shift workloads between racks, and trigger cooling pre-emptively, all within 50ms latency. No round-trip to the cloud required.", specs: ["Jetson Orin", "<50ms latency", "Per-row control"] },
  { id: "simulate", label: "Simulate", icon: Layers, color: "hsl(var(--primary))", short: "NVIDIA Omniverse enables what-if scenarios for expansion, failover, and cooling optimization.", full: "Omniverse simulation engine runs thousands of what-if scenarios: adding new racks, switching to liquid cooling, failing over an entire hall, or doubling GPU density. Each scenario completes in minutes, giving operators confidence before committing capital.", specs: ["Omniverse", "What-if engine", "Minutes per scenario"] },
];

// Clusters
const CLUSTERS = [
  { id: "dc-train-01", name: "DC Training Cluster", region: "US-East", nodes: 16, gpuUsed: 48, gpuTotal: 64, uptime: "99.97%", lastIncident: "14d ago", status: "healthy" as const },
  { id: "dc-infer-01", name: "DC Inference Cluster", region: "US-West", nodes: 24, gpuUsed: 72, gpuTotal: 96, uptime: "99.99%", lastIncident: "31d ago", status: "healthy" as const },
  { id: "edge-fleet", name: "Edge Fleet", region: "Multi-site", nodes: 48, gpuUsed: 42, gpuTotal: 48, uptime: "99.91%", lastIncident: "3d ago", status: "warning" as const },
];

const GPU_POOL = [
  { model: "NVIDIA B3100", count: 64, allocated: 48, utilAvg: 78, power: "700W", temp: "72C" },
  { model: "RTX PRO 6000", count: 96, allocated: 72, utilAvg: 65, power: "350W", temp: "68C" },
  { model: "Jetson Orin", count: 48, allocated: 42, utilAvg: 91, power: "15W", temp: "55C" },
];

const STORAGE_POOLS = [
  { name: "DDN A3I Primary", type: "NVMe TLC", total: "1.2 PB", used: "840 TB", iops: "40M", throughput: "120 GB/s", usedPct: 70 },
  { name: "DDN Infinia Tier", type: "Multi-protocol", total: "5 PB", used: "2.1 PB", iops: "100M", throughput: "200 GB/s", usedPct: 42 },
  { name: "DDN EXAScaler Archive", type: "Lustre", total: "20 PB", used: "8.4 PB", iops: "50M", throughput: "1 TB/s", usedPct: 42 },
];

const HEALTH_CHECKS = [
  { service: "DCIM Gateway", status: "ok" as const, latency: "2ms" },
  { service: "BMS Connector", status: "ok" as const, latency: "5ms" },
  { service: "GPU Scheduler", status: "ok" as const, latency: "1ms" },
  { service: "Omniverse Sync", status: "ok" as const, latency: "12ms" },
  { service: "DDN StorageLink", status: "ok" as const, latency: "3ms" },
  { service: "Jetson Fleet Mgr", status: "warning" as const, latency: "48ms" },
  { service: "Power Monitoring", status: "ok" as const, latency: "4ms" },
  { service: "Cooling Controller", status: "ok" as const, latency: "6ms" },
];

// Pods
interface Pod {
  id: string; name: string; scenario: string; cluster: string; gpuType: string;
  gpus: number; memory: string; status: "running" | "queued" | "stopped" | "error"; created: string;
}
const INITIAL_PODS: Pod[] = [
  { id: "1", name: "twin-inference", scenario: "PUE Optimization", cluster: "dc-infer-01", gpuType: "RTX PRO 6000", gpus: 8, memory: "384 GB", status: "running", created: "2026-03-01" },
  { id: "2", name: "pue-training", scenario: "Capacity Planning", cluster: "dc-train-01", gpuType: "B3100", gpus: 16, memory: "1.2 TB", status: "running", created: "2026-02-28" },
  { id: "3", name: "cooling-finetune", scenario: "Cooling Management", cluster: "dc-train-01", gpuType: "B3100", gpus: 4, memory: "320 GB", status: "queued", created: "2026-03-04" },
  { id: "4", name: "rack-edge", scenario: "Full DC Autonomy", cluster: "edge-fleet", gpuType: "Jetson Orin", gpus: 12, memory: "96 GB", status: "stopped", created: "2026-02-20" },
];

// Wizard scenarios
const SCENARIOS = [
  { id: "pue", label: "PUE Optimization", desc: "Train models to minimize Power Usage Effectiveness across facility zones.", gpus: 8, edge: 4, storage: "A3I TLC", icon: Zap },
  { id: "capacity", label: "Capacity Planning", desc: "Predict rack density limits and plan expansions with digital twin simulations.", gpus: 16, edge: 8, storage: "EXAScaler", icon: Server },
  { id: "cooling", label: "Cooling Management", desc: "Optimize CRAH units, liquid cooling loops, and airflow with real-time inference.", gpus: 4, edge: 12, storage: "A3I QLC", icon: Thermometer },
  { id: "autonomy", label: "Full DC Autonomy", desc: "End-to-end autonomous operations: collect, train, act, simulate in closed loop.", gpus: 32, edge: 24, storage: "DDN Infinia", icon: Bot },
];

const DDN_PRODUCTS = [
  { id: "a3i_tlc", label: "A3I TLC", desc: "All-flash AI storage for GPU training", specs: "15x checkpoint speed" },
  { id: "a3i_qlc", label: "A3I QLC", desc: "High-capacity flash for mixed workloads", specs: "Max capacity per U" },
  { id: "infinia", label: "DDN Infinia", desc: "Data intelligence fabric for inference", specs: "Multi-tenant, multi-protocol" },
  { id: "exascaler", label: "DDN EXAScaler", desc: "Parallel file system for AI/HPC", specs: "TB/s throughput" },
];

const DDN_FABRICS = [
  { id: "edge_only", label: "Edge-Only", desc: "All data on local A3I appliance" },
  { id: "sync_fabric", label: "Sync to Fabric", desc: "Local A3I with DDN Infinia backup" },
  { id: "cloud_primary", label: "Cloud Primary", desc: "EXAScaler as source of truth" },
];

const THROUGHPUT_TIERS = [
  { id: "low", label: "Low", sub: "<50 GB/s" },
  { id: "medium", label: "Medium", sub: "50-150 GB/s" },
  { id: "high", label: "High", sub: "150-500 GB/s" },
  { id: "max", label: "Max", sub: "TB/s class" },
];

const SYNC_WINDOWS = [
  { id: "realtime", label: "Realtime", sub: "< 1s lag" },
  { id: "hourly", label: "Hourly", sub: "Batch sync" },
  { id: "daily", label: "Daily", sub: "Off-peak" },
  { id: "manual", label: "Manual", sub: "On-demand" },
];

const SCENARIO_DDN_REC: Record<string, { product: string; reason: string }> = {
  pue: { product: "a3i_tlc", reason: "PUE models need fast checkpoint I/O. A3I TLC provides 15x checkpoint speed for rapid iteration." },
  capacity: { product: "exascaler", reason: "Capacity planning generates massive simulation data. EXAScaler delivers TB/s sustained throughput." },
  cooling: { product: "a3i_qlc", reason: "Cooling telemetry is high-volume but sequential. A3I QLC maximizes capacity per rack unit." },
  autonomy: { product: "infinia", reason: "Full autonomy requires multi-protocol access across all subsystems. DDN Infinia unifies the data fabric." },
};

/* ═══════════════════════════════════════════════════════════
   WIZARD STATE
   ═══════════════════════════════════════════════════════════ */
interface WizardState {
  scenario: string | null;
  ddnProduct: string | null;
  ddnFabric: string | null;
  gpuUtil: number;
  storageThroughput: number;
  edgeFleet: number;
  retention: number;
  throughputTier: string;
  syncWindow: string;
}

const WIZARD_INIT: WizardState = {
  scenario: null, ddnProduct: null, ddnFabric: null,
  gpuUtil: 50, storageThroughput: 50, edgeFleet: 8, retention: 30,
  throughputTier: "medium", syncWindow: "realtime",
};

function deriveWizardSpecs(w: WizardState) {
  const sc = SCENARIOS.find(s => s.id === w.scenario);
  const trainGpus = sc ? sc.gpus : Math.round(w.gpuUtil / 6);
  const inferGpus = Math.round(trainGpus * 0.75);
  const edgeCount = w.edgeFleet;
  const rackU = trainGpus * 2 + inferGpus + edgeCount + 6;
  const powerW = trainGpus * 700 + inferGpus * 350 + edgeCount * 15 + 500;
  const costPerKw = 0.12;
  const monthlyCost = Math.round((powerW / 1000) * costPerKw * 730);
  let readiness = 0;
  if (w.scenario) readiness += 20;
  readiness += 15; // infra always shown
  readiness += 15; // capacity always has defaults
  if (w.ddnProduct) readiness += 20;
  if (w.ddnFabric) readiness += 10;
  readiness += 10; // throughput always has default
  readiness += 10; // review
  return { trainGpus, inferGpus, edgeCount, rackU, powerW, monthlyCost, readiness: Math.min(100, readiness) };
}

const WIZARD_STEPS = ["Scenario", "Infrastructure", "Capacity", "Storage", "Throughput", "Review"];

/* ═══════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════ */
const InfrastructurePage = () => {
  // Auto-cycling stage
  const [activeStage, setActiveStage] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [progress, setProgress] = useState(0);

  // Pods CRUD
  const [pods, setPods] = useState<Pod[]>(INITIAL_PODS);
  const [editPod, setEditPod] = useState<Pod | null>(null);
  const [deletePod, setDeletePod] = useState<Pod | null>(null);
  const [editForm, setEditForm] = useState({ name: "", cluster: "", gpus: 0, memory: "" });

  // Wizard
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizard, setWizard] = useState<WizardState>({ ...WIZARD_INIT });

  // Operations collapsibles
  const [openOps, setOpenOps] = useState<Record<string, boolean>>({ clusters: true, gpu: false, storage: false, health: false });

  // Pipeline collapsible
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const pipelineRef = useRef<HTMLDivElement>(null);

  // Auto-cycle timer
  useEffect(() => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          setActiveStage(s => (s + 1) % STAGES.length);
          return 0;
        }
        return prev + 1;
      });
    }, 100);
    timerRef.current = interval;
    return () => clearInterval(interval);
  }, [activeStage]);

  const selectStage = useCallback((idx: number) => {
    setActiveStage(idx);
    setProgress(0);
  }, []);

  const scrollToFlow = useCallback(() => {
    setPipelineOpen(true);
    setTimeout(() => pipelineRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  const openWizard = useCallback(() => {
    setWizard({ ...WIZARD_INIT });
    setWizardStep(0);
    setWizardOpen(true);
  }, []);

  const handleEditPod = useCallback((pod: Pod) => {
    setEditForm({ name: pod.name, cluster: pod.cluster, gpus: pod.gpus, memory: pod.memory });
    setEditPod(pod);
  }, []);

  const saveEditPod = useCallback(() => {
    if (!editPod) return;
    setPods(prev => prev.map(p => p.id === editPod.id ? { ...p, ...editForm } : p));
    setEditPod(null);
    toast.success("Pod updated");
  }, [editPod, editForm]);

  const confirmDeletePod = useCallback(() => {
    if (!deletePod) return;
    setPods(prev => prev.filter(p => p.id !== deletePod.id));
    setDeletePod(null);
    toast.success("Pod deleted");
  }, [deletePod]);

  const deployWizard = useCallback(() => {
    const specs = deriveWizardSpecs(wizard);
    const sc = SCENARIOS.find(s => s.id === wizard.scenario);
    const newPod: Pod = {
      id: String(Date.now()),
      name: `pod-${wizard.scenario || "custom"}-${Date.now().toString(36).slice(-4)}`,
      scenario: sc?.label || "Custom",
      cluster: "dc-train-01",
      gpuType: "B3100",
      gpus: specs.trainGpus,
      memory: `${specs.trainGpus * 80} GB`,
      status: "queued",
      created: new Date().toISOString().slice(0, 10),
    };
    setPods(prev => [newPod, ...prev]);
    setWizardOpen(false);
    toast.success(`Pod "${newPod.name}" deployed`, { description: `${specs.trainGpus} GPUs, ${specs.rackU}U rack space` });
  }, [wizard]);

  const wSpecs = useMemo(() => deriveWizardSpecs(wizard), [wizard]);

  const stage = STAGES[activeStage];

  // Status color helper
  const statusColor = (s: Pod["status"]) => {
    switch (s) {
      case "running": return "bg-green-500";
      case "queued": return "bg-amber-500";
      case "stopped": return "bg-muted-foreground";
      case "error": return "bg-red-500";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* ════════ 1. HERO CTA ════════ */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <Card className="overflow-hidden border-primary/20">
            <div className="relative min-h-[280px] md:min-h-[320px]">
              {/* Background image - right side */}
              <div className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute right-0 top-0 bottom-0 w-[45%] hidden lg:block"
                  style={{
                    backgroundImage: `url(${dcHeroVisual})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center right",
                  }}
                />
                {/* Left-edge gradient blend into card background */}
                <div className="absolute inset-0 hidden lg:block" style={{
                  background: "linear-gradient(to right, hsl(var(--card)) 50%, hsl(var(--card) / 0.7) 60%, hsl(var(--card) / 0.2) 75%, transparent 85%)",
                }} />
              </div>

              {/* Content */}
              <div className="relative z-10 p-6 md:p-8 lg:p-10 max-w-xl">
                <Badge variant="outline" className="mb-4 text-xs font-sans border-primary/30 text-primary">
                  PHYSICAL AI · DIGITAL TWIN
                </Badge>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                  Ready to build your infrastructure?
                </h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  Use the Pod Designer to configure your NVIDIA + DDN hardware stack for your specific
                  data centre scenario. Get recommendations, cost estimates, and deploy in minutes.
                </p>

                {/* How it comes together */}
                <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-2.5 mb-5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <span className="font-semibold text-foreground">How it comes together:</span>{" "}
                    Sensors collect facility data, GPUs train AI models, a living digital twin is synthesized, and
                    edge devices act autonomously.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button onClick={openWizard} size="sm">
                    <Plus className="h-4 w-4 mr-1" /> Design Your Pod
                  </Button>
                  <Button variant="outline" size="sm" onClick={scrollToFlow}>
                    <Link2 className="h-4 w-4 mr-1" /> Data Flow
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* ════════ 2. HOW IT WORKS STRIP ════════ */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">How It Works</h2>
          <div className="grid grid-cols-5 gap-2 md:gap-3 relative">
            {STAGES.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === activeStage;
              const stageColorVar = s.id === "collect" ? "--accent-foreground" : s.id === "train" ? "--warning" : s.id === "synthesize" ? "--success" : s.id === "act" ? "--info" : "--primary";
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => selectStage(i)}
                    className={cn(
                      "relative p-2 md:p-3 rounded-lg border text-left transition-all duration-300",
                      isActive
                        ? "border-primary/50 ring-2 ring-primary/20 shadow-[0_0_20px_-4px_hsl(var(--primary)/0.25)]"
                        : "border-border bg-card hover:border-primary/20"
                    )}
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, hsl(${stageColorVar === "--accent-foreground" ? "var(--accent)" : `var(${stageColorVar})`} / 0.08), hsl(var(--card)))`
                        : `hsl(${stageColorVar === "--accent-foreground" ? "var(--accent)" : `var(${stageColorVar})`} / 0.02)`,
                    }}
                  >
                    <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-1.5">
                      <Icon className="h-4 w-4 shrink-0" style={{ color: s.color }} />
                      <span className={cn("text-xs font-semibold font-sans truncate", isActive ? "text-primary" : "text-foreground")}>{s.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 hidden md:block">{s.short}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 md:hidden">{s.label}</p>
                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-lg overflow-hidden bg-muted/20">
                      {isActive && (
                        <motion.div
                          className="h-full rounded-b-lg"
                          style={{ background: s.color }}
                          initial={{ width: "0%" }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.1, ease: "linear" }}
                        />
                      )}
                    </div>
                  </button>
                </React.Fragment>
              );
            })}
            {/* Connecting arrows overlaid between cards (desktop) */}
            {[0, 1, 2, 3].map(i => (
              <div key={`arrow-${i}`} className="hidden md:flex absolute items-center justify-center pointer-events-none"
                style={{ top: "50%", left: `${(i + 1) * 20}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}>
                <motion.div animate={{ x: [0, 3, 0] }} transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.15 }}>
                  <ChevronRight className="h-4 w-4 text-primary/30" />
                </motion.div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mt-3 p-4 rounded-lg border border-primary/15 bg-card"
              style={{ background: `linear-gradient(135deg, hsl(var(--card)), hsl(var(--primary) / 0.03))` }}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${stage.color}15`, border: `1px solid ${stage.color}30` }}>
                  <stage.icon className="h-6 w-6" style={{ color: stage.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">{stage.label}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-2">{stage.full}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stage.specs.map(sp => (
                      <Badge key={sp} variant="secondary" className="text-xs font-mono font-sans">{sp}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* ════════ 3. OPERATIONAL METRICS ════════ */}
        <div>
          <h2 className="text-lg md:text-xl font-bold text-foreground mb-3">Operational Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Training GPUs (B3100)", value: "48 / 64", pct: 75, icon: Cpu, color: "primary" },
              { label: "Inference GPUs (RTX PRO 6000)", value: "72 / 96", pct: 75, icon: Eye, color: "primary" },
              { label: "Edge Devices (Jetson)", value: "42 / 48", pct: 87, icon: Bot, color: "primary" },
              { label: "DDN Throughput", value: "320 GB/s", pct: 64, icon: HardDrive, color: "primary" },
              { label: "Twin Freshness", value: "2.1s", pct: 95, icon: Activity, color: "primary" },
            ].map(m => (
              <Card key={m.label} className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <m.icon className="h-4 w-4" style={{ color: `hsl(var(--${m.color}))` }} />
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-semibold font-sans truncate">{m.label}</span>
                </div>
                <p className="text-lg font-bold font-mono text-foreground mb-1">{m.value}</p>
                <Progress value={m.pct} className="h-1.5" />
              </Card>
            ))}
          </div>
        </div>

        {/* ════════ 4. OPERATIONS SECTION ════════ */}
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-bold text-foreground">Operations</h2>

          {/* Cluster Management */}
          <Collapsible open={openOps.clusters} onOpenChange={v => setOpenOps(p => ({ ...p, clusters: v }))}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 px-4 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Cluster Management</CardTitle>
                    <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", openOps.clusters && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {CLUSTERS.map(c => (
                      <div key={c.id} className="p-3 rounded-md border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={cn("w-2 h-2 rounded-full", c.status === "healthy" ? "bg-green-500" : "bg-amber-500")} />
                          <span className="text-xs font-semibold text-foreground">{c.name}</span>
                        </div>
                        <div className="space-y-1 text-xs font-mono text-muted-foreground">
                          <div className="flex justify-between"><span>Region</span><span className="text-foreground">{c.region}</span></div>
                          <div className="flex justify-between"><span>Nodes</span><span className="text-foreground">{c.nodes}</span></div>
                          <div className="flex justify-between"><span>GPUs</span><span className="text-foreground">{c.gpuUsed}/{c.gpuTotal}</span></div>
                          <div className="flex justify-between"><span>Uptime</span><span className="text-foreground">{c.uptime}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* GPU Pool */}
          <Collapsible open={openOps.gpu} onOpenChange={v => setOpenOps(p => ({ ...p, gpu: v }))}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 px-4 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">GPU Pool Allocation</CardTitle>
                    <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", openOps.gpu && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {GPU_POOL.map(g => (
                    <div key={g.model}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{g.model}</span>
                        <span className="text-xs font-mono text-muted-foreground">{g.allocated}/{g.count} allocated - {g.utilAvg}% avg</span>
                      </div>
                      <Progress value={(g.allocated / g.count) * 100} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Storage Pools DDN */}
          <Collapsible open={openOps.storage} onOpenChange={v => setOpenOps(p => ({ ...p, storage: v }))}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 px-4 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Storage Pools DDN</CardTitle>
                    <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", openOps.storage && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-3">
                  {STORAGE_POOLS.map(sp => (
                    <div key={sp.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{sp.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{sp.used} / {sp.total} - {sp.throughput}</span>
                      </div>
                      <Progress value={sp.usedPct} className="h-1.5" />
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* System Health */}
          <Collapsible open={openOps.health} onOpenChange={v => setOpenOps(p => ({ ...p, health: v }))}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 px-4 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-500" />
                    <CardTitle className="text-sm">System Health</CardTitle>
                    <Badge variant="secondary" className="ml-2 text-xs font-sans">
                      {HEALTH_CHECKS.filter(h => h.status === "ok").length}/{HEALTH_CHECKS.length} OK
                    </Badge>
                    <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", openOps.health && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {HEALTH_CHECKS.map(h => (
                      <div key={h.service} className="flex items-center gap-2 py-1.5 px-2">
                        {h.status === "ok" ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                        <span className="text-xs text-foreground flex-1 truncate">{h.service}</span>
                        <span className="text-xs font-mono text-muted-foreground">{h.latency}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* ════════ 5. DEPLOYED PODS TABLE ════════ */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rocket className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm">Deployed Pods</CardTitle>
                <Badge variant="secondary" className="text-xs font-sans">{pods.length} total</Badge>
              </div>
              <Button size="sm" variant="outline" onClick={openWizard}>
                <Plus className="h-3.5 w-3.5 mr-1" /> New Pod
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground font-sans">
                    <th className="text-left py-2 px-2">Pod</th>
                    <th className="text-left py-2 px-2">Scenario</th>
                    <th className="text-left py-2 px-2 hidden md:table-cell">Cluster</th>
                    <th className="text-left py-2 px-2 hidden lg:table-cell">GPU Type</th>
                    <th className="text-right py-2 px-2">GPUs</th>
                    <th className="text-right py-2 px-2 hidden md:table-cell">Memory</th>
                    <th className="text-center py-2 px-2">Status</th>
                    <th className="text-right py-2 px-2 hidden lg:table-cell">Created</th>
                    <th className="text-right py-2 px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map(pod => (
                    <tr key={pod.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-2 px-2 font-semibold text-foreground font-mono">{pod.name}</td>
                      <td className="py-2 px-2 text-muted-foreground">{pod.scenario}</td>
                      <td className="py-2 px-2 text-muted-foreground hidden md:table-cell font-mono">{pod.cluster}</td>
                      <td className="py-2 px-2 text-muted-foreground hidden lg:table-cell">{pod.gpuType}</td>
                      <td className="py-2 px-2 text-right font-mono text-foreground">{pod.gpus}</td>
                      <td className="py-2 px-2 text-right font-mono text-muted-foreground hidden md:table-cell">{pod.memory}</td>
                      <td className="py-2 px-2 text-center">
                        <span className="inline-flex items-center gap-1">
                          <span className={cn("w-2 h-2 rounded-full", statusColor(pod.status), (pod.status === "running" || pod.status === "error") && "animate-pulse")} />
                          <span className="text-xs capitalize font-sans">{pod.status}</span>
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right text-muted-foreground hidden lg:table-cell">{pod.created}</td>
                      <td className="py-2 px-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditPod(pod)}>
                              <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeletePod(pod)} className="text-destructive">
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* ════════ 6. DATA FLOW PIPELINE ════════ */}
        <div ref={pipelineRef}>
          <Collapsible open={pipelineOpen} onOpenChange={setPipelineOpen}>
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="py-3 px-4 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">Physical AI Pipeline: Data Flow</CardTitle>
                    <ChevronDown className={cn("h-4 w-4 ml-auto text-muted-foreground transition-transform", pipelineOpen && "rotate-180")} />
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-0">
                  {/* Closed-loop banner - TOP */}
                  <div className="mb-4 p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/[0.04] flex items-center gap-3">
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
                      <RotateCcw className="h-5 w-5 text-primary" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-bold text-foreground font-sans">Closed-Loop Feedback</p>
                      <p className="text-xs text-muted-foreground font-sans">Act telemetry feeds back into Collect for continuous retraining. Every cycle improves model accuracy.</p>
                    </div>
                  </div>

                  {STAGES.map((s, i) => {
                    const Icon = s.icon;
                    const stageColorVar = s.id === "collect" ? "--accent-foreground" : s.id === "train" ? "--warning" : s.id === "synthesize" ? "--success" : s.id === "act" ? "--info" : "--primary";
                    return (
                      <React.Fragment key={s.id}>
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className="p-4 rounded-lg border transition-all hover:shadow-md"
                          style={{
                            borderColor: `${s.color}30`,
                            background: `linear-gradient(90deg, ${s.color}08, transparent)`,
                          }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ background: `${s.color}15`, color: s.color, border: `1px solid ${s.color}25` }}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="text-xs font-mono font-sans">{i + 1}/5</Badge>
                                <span className="text-sm font-semibold text-foreground">{s.label}</span>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-2">{s.full}</p>
                              <div className="flex flex-wrap gap-1.5">
                                {s.specs.map(sp => (
                                  <Badge key={sp} variant="secondary" className="text-xs font-mono font-sans">{sp}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                        {i < STAGES.length - 1 && (
                          <div className="flex justify-center py-1.5 relative">
                            {/* Vertical line with flowing dot */}
                            <div className="relative h-6 w-px bg-border">
                              <motion.div
                                className="absolute w-2 h-2 rounded-full left-1/2 -translate-x-1/2"
                                style={{ background: s.color }}
                                animate={{ top: [0, 20, 0] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "linear", delay: i * 0.2 }}
                              />
                            </div>
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Edit Pod Dialog */}
        <Dialog open={!!editPod} onOpenChange={open => !open && setEditPod(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pod</DialogTitle>
              <DialogDescription>Update pod configuration.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Name</label>
                <input className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground block mb-1">Cluster</label>
                <input className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" value={editForm.cluster} onChange={e => setEditForm(p => ({ ...p, cluster: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">GPUs</label>
                  <input type="number" className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" value={editForm.gpus} onChange={e => setEditForm(p => ({ ...p, gpus: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground block mb-1">Memory</label>
                  <input className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm" value={editForm.memory} onChange={e => setEditForm(p => ({ ...p, memory: e.target.value }))} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditPod(null)}>Cancel</Button>
              <Button onClick={saveEditPod}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={!!deletePod} onOpenChange={open => !open && setDeletePod(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Pod</DialogTitle>
              <DialogDescription>Are you sure you want to delete "{deletePod?.name}"? This cannot be undone.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletePod(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeletePod}>Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ════════ 7. POD DESIGNER WIZARD ════════ */}
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="max-w-6xl h-[90vh] flex flex-col p-0 gap-0">
            {/* Wizard Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center bg-primary/10">
                  <Server className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-foreground">Pod Designer</h2>
                  <p className="text-xs text-muted-foreground font-sans">Configure NVIDIA + DDN infrastructure</p>
                </div>
              </div>
              {/* Stepper */}
              <div className="hidden md:flex items-center gap-1">
                {WIZARD_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center">
                    <button
                      onClick={() => i <= wizardStep && setWizardStep(i)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-semibold font-sans transition-colors",
                        i === wizardStep ? "bg-primary text-primary-foreground" : i < wizardStep ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      )}
                    >
                      {s}
                    </button>
                    {i < WIZARD_STEPS.length - 1 && <ChevronRight className="h-3 w-3 mx-0.5 text-muted-foreground/30" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Wizard Body */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Step Content */}
              <div className="flex-1 overflow-y-auto p-5">
                <div className="max-w-xl">
                  {/* Step 0: Scenario */}
                  {wizardStep === 0 && (
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Select Scenario</h3>
                      <p className="text-xs text-muted-foreground mb-4">Choose the primary data centre workload. Infrastructure will be auto-configured.</p>
                      <div className="grid grid-cols-2 gap-3">
                        {SCENARIOS.map(sc => {
                          const Icon = sc.icon;
                          const active = wizard.scenario === sc.id;
                          return (
                            <button
                              key={sc.id}
                              onClick={() => setWizard(p => ({ ...p, scenario: sc.id }))}
                              className={cn("p-4 rounded-lg border text-left transition-all", active ? "border-primary/50 bg-primary/5" : "border-border bg-card hover:border-primary/20")}
                            >
                              <Icon className="h-5 w-5 mb-2" style={{ color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                              <p className={cn("text-xs font-semibold mb-1", active ? "text-primary" : "text-foreground")}>{sc.label}</p>
                              <p className="text-xs text-muted-foreground mb-2">{sc.desc}</p>
                              <div className="flex gap-1.5 flex-wrap">
                                <Badge variant="secondary" className="text-[11px] font-sans">{sc.gpus} GPUs</Badge>
                                <Badge variant="secondary" className="text-[11px] font-sans">{sc.edge} Edge</Badge>
                                <Badge variant="secondary" className="text-[11px] font-sans">{sc.storage}</Badge>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Step 1: Infrastructure */}
                  {wizardStep === 1 && (
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Infrastructure Architecture</h3>
                      <p className="text-xs text-muted-foreground mb-4">Your pod uses these NVIDIA + DDN components in a closed-loop pipeline.</p>
                      <div className="space-y-3">
                        {[
                          { label: "DDN Storage", spec: "A3I / Infinia / EXAScaler", role: "High-throughput data ingestion and tiered storage", icon: HardDrive },
                          { label: "NVIDIA B3100", spec: "Blackwell Architecture", role: "Training GPU cluster for facility AI models", icon: Cpu },
                          { label: "RTX PRO 6000", spec: "Ada Lovelace", role: "Inference and 3D digital twin rendering", icon: Eye },
                          { label: "NVIDIA Jetson", spec: "Orin NX/AGX", role: "Edge inference per rack row, sub-50ms latency", icon: Bot },
                        ].map((node, i) => (
                          <React.Fragment key={node.label}>
                            <div className="flex items-start gap-3 p-3 rounded-lg border border-border bg-card">
                              <div className="w-9 h-9 rounded-md flex items-center justify-center bg-primary/10 shrink-0">
                                <node.icon className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-foreground">{node.label}</p>
                                <p className="text-xs font-mono text-primary/70">{node.spec}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{node.role}</p>
                              </div>
                            </div>
                            {i < 3 && (
                              <div className="flex justify-center">
                                <ArrowDown className="h-3.5 w-3.5 text-primary/30" />
                              </div>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 2: Capacity */}
                  {wizardStep === 2 && (
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Capacity Configuration</h3>
                      <p className="text-xs text-muted-foreground mb-4">Tune GPU utilization, storage throughput, edge fleet size, and data retention.</p>
                      <div className="space-y-5">
                        {[
                          { label: "GPU Utilization", value: wizard.gpuUtil, key: "gpuUtil" as const, suffix: "%", max: 100, icon: Cpu },
                          { label: "Storage Throughput", value: wizard.storageThroughput, key: "storageThroughput" as const, suffix: "%", max: 100, icon: HardDrive },
                          { label: "Edge Fleet Size", value: wizard.edgeFleet, key: "edgeFleet" as const, suffix: "", max: 24, icon: Bot },
                          { label: "Data Retention", value: wizard.retention, key: "retention" as const, suffix: "d", max: 365, icon: Clock },
                        ].map(sl => (
                          <div key={sl.key}>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <sl.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs font-semibold text-foreground">{sl.label}</span>
                              </div>
                              <span className="text-xs font-mono font-bold text-primary">{sl.value}{sl.suffix}</span>
                            </div>
                            <input
                              type="range" min={sl.key === "edgeFleet" ? 1 : sl.key === "retention" ? 1 : 1} max={sl.max} value={sl.value}
                              onChange={e => setWizard(p => ({ ...p, [sl.key]: Number(e.target.value) }))}
                              className="w-full h-2 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                              style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${(sl.value / sl.max) * 100}%, hsl(var(--muted)) ${(sl.value / sl.max) * 100}%)` }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 3: Storage & Pipeline */}
                  {wizardStep === 3 && (
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Storage and Pipeline</h3>
                      <p className="text-xs text-muted-foreground mb-4">Select DDN storage product and data fabric configuration.</p>
                      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-sans mb-2">DDN Product</p>
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        {DDN_PRODUCTS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => setWizard(prev => ({ ...prev, ddnProduct: p.id }))}
                            className={cn("p-3 rounded-lg border text-left transition-all", wizard.ddnProduct === p.id ? "border-primary/50 bg-primary/5" : "border-border bg-card")}
                          >
                            <HardDrive className="h-4 w-4 mb-1.5" style={{ color: wizard.ddnProduct === p.id ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }} />
                            <p className={cn("text-xs font-semibold", wizard.ddnProduct === p.id ? "text-primary" : "text-foreground")}>{p.label}</p>
                            <p className="text-xs text-muted-foreground">{p.desc}</p>
                            <p className="text-xs font-mono text-primary/60 mt-1">{p.specs}</p>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-sans mb-2">Data Fabric</p>
                      <div className="space-y-2">
                        {DDN_FABRICS.map(f => (
                          <button
                            key={f.id}
                            onClick={() => setWizard(prev => ({ ...prev, ddnFabric: f.id }))}
                            className={cn("w-full p-3 rounded-lg border text-left transition-all", wizard.ddnFabric === f.id ? "border-primary/50 bg-primary/5" : "border-border bg-card")}
                          >
                            <p className={cn("text-xs font-semibold", wizard.ddnFabric === f.id ? "text-primary" : "text-foreground")}>{f.label}</p>
                            <p className="text-xs text-muted-foreground">{f.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 4: Throughput */}
                  {wizardStep === 4 && (
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Throughput and Sync</h3>
                      <p className="text-xs text-muted-foreground mb-4">Configure throughput tier and synchronization window.</p>
                      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-sans mb-2">Throughput Tier</p>
                      <div className="grid grid-cols-4 gap-2 mb-6">
                        {THROUGHPUT_TIERS.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setWizard(p => ({ ...p, throughputTier: t.id }))}
                            className={cn("p-2.5 rounded-md text-center transition-all border", wizard.throughputTier === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border")}
                          >
                            <p className="text-xs font-semibold">{t.label}</p>
                            <p className="text-[11px] opacity-70 font-sans">{t.sub}</p>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-sans mb-2">Sync Window</p>
                      <div className="grid grid-cols-4 gap-2 mb-6">
                        {SYNC_WINDOWS.map(sw => (
                          <button
                            key={sw.id}
                            onClick={() => setWizard(p => ({ ...p, syncWindow: sw.id }))}
                            className={cn("p-2.5 rounded-md text-center transition-all border", wizard.syncWindow === sw.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border")}
                          >
                            <p className="text-xs font-semibold">{sw.label}</p>
                            <p className="text-[11px] opacity-70 font-sans">{sw.sub}</p>
                          </button>
                        ))}
                      </div>
                      {/* Pipeline flow viz */}
                      <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-sans mb-2">Data Pipeline</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        {["Ingest", "Train", "Infer", "Deploy"].map((st, i) => (
                          <React.Fragment key={st}>
                            <Badge variant="outline" className="text-xs font-sans">{st}</Badge>
                            {i < 3 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Step 5: Review */}
                  {wizardStep === 5 && (
                    <div>
                      <h3 className="text-base font-bold text-foreground mb-1">Review and Deploy</h3>
                      <p className="text-xs text-muted-foreground mb-4">Verify your pod configuration before deployment.</p>

                      {/* ROI Card */}
                      <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 mb-4">
                        <p className="text-xs uppercase tracking-wider font-semibold text-primary font-sans mb-1">Estimated Impact</p>
                        <p className="text-lg font-bold text-foreground">12-18% PUE improvement</p>
                        <p className="text-xs text-muted-foreground">Based on your scenario and infrastructure selection</p>
                      </div>

                      {/* Infra summary cards */}
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="p-3 rounded-md border border-border text-center">
                          <Cpu className="h-4 w-4 mx-auto mb-1 text-primary" />
                          <p className="text-lg font-bold font-mono text-foreground">{wSpecs.trainGpus}</p>
                          <p className="text-xs text-muted-foreground font-sans">B3100 GPUs</p>
                        </div>
                        <div className="p-3 rounded-md border border-border text-center">
                          <Eye className="h-4 w-4 mx-auto mb-1 text-primary" />
                          <p className="text-lg font-bold font-mono text-foreground">{wSpecs.inferGpus}</p>
                          <p className="text-xs text-muted-foreground font-sans">RTX PRO 6000</p>
                        </div>
                        <div className="p-3 rounded-md border border-border text-center">
                          <Bot className="h-4 w-4 mx-auto mb-1 text-primary" />
                          <p className="text-lg font-bold font-mono text-foreground">{wSpecs.edgeCount}</p>
                          <p className="text-xs text-muted-foreground font-sans">Jetson Nodes</p>
                        </div>
                      </div>

                      {/* Metrics */}
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { label: "Rack Units", value: `${wSpecs.rackU}U` },
                          { label: "Power Draw", value: `${wSpecs.powerW}W` },
                          { label: "Monthly Cost", value: `$${wSpecs.monthlyCost}` },
                          { label: "Readiness", value: `${wSpecs.readiness}%` },
                        ].map(m => (
                          <div key={m.label} className="p-2 rounded-md border border-border flex justify-between items-center">
                            <span className="text-xs text-muted-foreground font-sans">{m.label}</span>
                            <span className="text-xs font-bold font-mono text-foreground">{m.value}</span>
                          </div>
                        ))}
                      </div>

                      <Button onClick={deployWizard} className="w-full">
                        <Rocket className="h-4 w-4 mr-2" /> Deploy Pod
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Rack Preview Sidebar */}
              <div className="hidden lg:flex flex-col w-[280px] shrink-0 border-l border-border bg-card/50 p-4 overflow-y-auto">
                {/* Rack Preview */}
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-sans mb-3">Rack Preview</p>
                <div className="rounded-lg border border-border bg-background p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-foreground font-semibold">RACK-01 . {wSpecs.rackU}U</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-xs text-muted-foreground font-sans">PWR OK</span>
                    </div>
                  </div>
                  <div className="space-y-0.5">
                    {Array.from({ length: Math.min(wSpecs.rackU, 20) }).map((_, i) => {
                      const isTrainGpu = i < wSpecs.trainGpus;
                      const isInferGpu = i >= wSpecs.trainGpus && i < wSpecs.trainGpus + wSpecs.inferGpus;
                      const isEdge = i >= wSpecs.trainGpus + wSpecs.inferGpus && i < wSpecs.trainGpus + wSpecs.inferGpus + Math.min(wSpecs.edgeCount, 6);
                      const slotType = isTrainGpu ? "train" : isInferGpu ? "infer" : isEdge ? "edge" : "empty";
                      const slotLabel = isTrainGpu ? `GPU-${i}` : isInferGpu ? `INF-${i - wSpecs.trainGpus}` : isEdge ? `EDGE-${i - wSpecs.trainGpus - wSpecs.inferGpus}` : null;
                      return (
                        <div
                          key={i}
                          className="h-4 rounded-sm flex items-center justify-between px-2"
                          style={{
                            background: isTrainGpu ? "hsl(var(--primary) / 0.12)" : isInferGpu ? "hsl(var(--success) / 0.12)" : isEdge ? "hsl(var(--warning) / 0.12)" : "hsl(var(--muted) / 0.15)",
                            border: `1px solid ${isTrainGpu ? "hsl(var(--primary) / 0.25)" : isInferGpu ? "hsl(var(--success) / 0.25)" : isEdge ? "hsl(var(--warning) / 0.25)" : "hsl(var(--border))"}`,
                          }}
                        >
                          {slotLabel ? (
                            <>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-foreground/70">{slotLabel}</span>
                                {(isTrainGpu || isInferGpu) && (
                                  <Badge variant="outline" className="text-[8px] py-0 px-1 h-3 leading-none border-current/20"
                                    style={{ color: isTrainGpu ? "hsl(var(--primary))" : "hsl(var(--success))" }}>
                                    GPU
                                  </Badge>
                                )}
                              </div>
                              <div className="flex gap-[2px]">
                                {Array.from({ length: isEdge ? 2 : 4 }).map((_, j) => (
                                  <div key={j} className="w-2 h-2 rounded-[1px]"
                                    style={{ background: isTrainGpu ? "hsl(var(--primary) / 0.6)" : isInferGpu ? "hsl(var(--success) / 0.6)" : "hsl(var(--warning) / 0.6)" }} />
                                ))}
                              </div>
                            </>
                          ) : (
                            <span className="text-[10px] font-mono text-muted-foreground/40 mx-auto">- EMPTY -</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground font-sans mb-4">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(var(--primary) / 0.4)" }} /> Train</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(var(--success) / 0.4)" }} /> Infer</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: "hsl(var(--warning) / 0.4)" }} /> Edge</span>
                </div>

                {/* Readiness */}
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-sans mb-2">Readiness Score</p>
                <div className="mb-1">
                  <div className="relative h-3 w-full rounded-full overflow-hidden bg-muted/30">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${wSpecs.readiness}%`,
                        background: wSpecs.readiness >= 80
                          ? "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--success)))"
                          : wSpecs.readiness >= 50
                            ? "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--warning)))"
                            : "linear-gradient(90deg, hsl(var(--destructive)), hsl(var(--warning)))"
                      }}
                    />
                  </div>
                </div>
                <p className="text-sm font-bold font-mono text-primary mb-4">{wSpecs.readiness}%</p>

                {/* Cost */}
                <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground font-sans mb-2">Cost Estimator</p>
                <div className="p-3 rounded-lg border border-border mb-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-sans">$/kW</span>
                    <span className="text-sm font-bold font-mono text-foreground">$0.12</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-sans">Monthly</span>
                    <span className="text-sm font-bold font-mono text-primary">${wSpecs.monthlyCost}</span>
                  </div>
                </div>

                {/* DDN Recommendation */}
                {wizard.scenario && SCENARIO_DDN_REC[wizard.scenario] && (
                  <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 mt-3">
                    <p className="text-xs uppercase tracking-wider font-bold text-primary font-sans mb-1.5">DDN Recommendation</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {SCENARIO_DDN_REC[wizard.scenario].reason}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Wizard Bottom Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-border shrink-0">
              <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                <span>Rack <strong className="text-foreground">{wSpecs.rackU}U</strong></span>
                <span>Power <strong className="text-foreground">{wSpecs.powerW}W</strong></span>
                <span>$/kW <strong className="text-foreground">$0.12</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={wizardStep === 0} onClick={() => setWizardStep(p => p - 1)}>
                  <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back
                </Button>
                {wizardStep < WIZARD_STEPS.length - 1 && (
                  <Button variant="outline" size="sm" onClick={() => setWizardStep(p => p + 1)}>
                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={() => { setWizardOpen(false); toast.success("Draft saved"); }}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Save Draft
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  );
};

export default InfrastructurePage;
