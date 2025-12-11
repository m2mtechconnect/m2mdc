/**
 * TwinIntegrationsGrid - Integration logos and ecosystem section
 */

import { Cloud, Cpu, Server, Gauge } from "lucide-react";

const integrations = [
  { 
    name: "AWS", 
    description: "Cloud telemetry",
    icon: Cloud,
  },
  { 
    name: "Azure", 
    description: "Cloud monitoring",
    icon: Cloud,
  },
  { 
    name: "Google Cloud", 
    description: "GCP metrics",
    icon: Cloud,
  },
  { 
    name: "NVIDIA", 
    description: "GPU fleet management",
    icon: Cpu,
  },
  { 
    name: "Nlyte / Sunbird", 
    description: "DCIM data feed",
    icon: Server,
  },
  { 
    name: "Schneider", 
    description: "EcoStruxure",
    icon: Gauge,
  },
  { 
    name: "M2M AURA", 
    description: "Agentic Studio",
    icon: Server,
  },
  { 
    name: "Carbon APIs", 
    description: "Emissions tracking",
    icon: Gauge,
  },
];

export function TwinIntegrationsGrid() {
  return (
    <section className="py-16 lg:py-24 bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Connect to Your Existing Stack
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Ingest metrics from DCIM, cloud, GPU platforms, and sustainability APIs. 
            Enrich with AI-driven modeling.
          </p>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
          {integrations.map((integration, index) => (
            <div 
              key={index}
              className="group flex flex-col items-center p-6 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-primary/50 hover:bg-slate-800/50 transition-all"
            >
              <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <integration.icon className="h-8 w-8 text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <div className="text-center">
                <div className="font-semibold text-white mb-1">
                  {integration.name}
                </div>
                <div className="text-xs text-slate-500">
                  {integration.description}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
