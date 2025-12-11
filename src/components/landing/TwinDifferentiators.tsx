/**
 * TwinDifferentiators - Why we're different section
 */

import { 
  Shield, 
  Box, 
  Leaf, 
  Cpu,
  Check
} from "lucide-react";

const differentiators = [
  {
    icon: Shield,
    title: "Sovereignty-First Digital Twin",
    description: "Built from the ground up for Canadian and EU data residency requirements.",
  },
  {
    icon: Box,
    title: "3D Visualization + Simulation in One UI",
    description: "See your data centre in 3D and run what-if scenarios without switching tools.",
  },
  {
    icon: Leaf,
    title: "Green vs Brown Build Economics",
    description: "Compare renewable and carbon-intensive options with one click.",
  },
  {
    icon: Cpu,
    title: "Subsystem Agents for Every Domain",
    description: "Autonomous agents for power, cooling, GPUs, workload, and carbon optimization.",
  },
];

export function TwinDifferentiators() {
  return (
    <section className="py-16 lg:py-24 bg-slate-900/50">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Why Organizations Choose Our Platform
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Purpose-built for sovereign, sustainable AI infrastructure — not retrofitted from generic tools.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {differentiators.map((diff, index) => (
            <div 
              key={index}
              className="flex gap-4 p-6 bg-slate-800/30 rounded-xl border border-slate-700/50 hover:border-primary/50 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <diff.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {diff.title}
                </h3>
                <p className="text-slate-400 text-sm">
                  {diff.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Additional comparison points */}
        <div className="mt-12 p-6 bg-slate-800/20 rounded-xl border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4 text-center">
            Key Platform Capabilities
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              "Real-time PUE monitoring",
              "Carbon cost modeling",
              "GPU workload simulation",
              "Cooling optimization",
              "Sovereignty scoring",
              "Compliance audits",
              "Energy mix analysis",
              "Failure scenario testing",
            ].map((cap, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                <Check className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
