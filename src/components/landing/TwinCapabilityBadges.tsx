/**
 * TwinCapabilityBadges - Horizontal badge row showing key capabilities
 */

import { 
  Shield, 
  Leaf, 
  Box, 
  FileCheck, 
  Cpu, 
  DollarSign 
} from "lucide-react";

const capabilities = [
  { icon: Shield, label: "Sovereign Compute (Canada / EU)" },
  { icon: Leaf, label: "Green AI Infrastructure" },
  { icon: Box, label: "Digital Twin Simulation" },
  { icon: FileCheck, label: "OSFI / HIPAA / PIPEDA Ready" },
  { icon: Cpu, label: "GPU & Cooling Optimization" },
  { icon: DollarSign, label: "Carbon & Cost Modeling" },
];

export function TwinCapabilityBadges() {
  return (
    <section className="bg-slate-900/50 border-y border-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
          {capabilities.map((cap, index) => (
            <div 
              key={index}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 text-sm text-slate-300 hover:border-primary/50 hover:text-primary transition-colors"
            >
              <cap.icon className="h-4 w-4 text-primary" />
              <span>{cap.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
