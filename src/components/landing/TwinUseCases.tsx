/**
 * TwinUseCases - Persona cards showing use cases
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  Building2, 
  Leaf, 
  Server, 
  Cpu,
  Check
} from "lucide-react";

const personas = [
  {
    icon: Building2,
    title: "CIO / CTO",
    subtitle: "Shape sovereign AI and DC strategy",
    bullets: [
      "Model build vs buy scenarios for AI infrastructure",
      "Quantify sovereignty and compliance posture",
      "Align DC strategy with ESG and carbon goals",
    ],
  },
  {
    icon: Leaf,
    title: "Sustainability Lead",
    subtitle: "Quantify and reduce energy and carbon footprints",
    bullets: [
      "Track Scope 2 and Scope 3 emissions in real-time",
      "Compare renewable energy mix across regions",
      "Report carbon savings to stakeholders",
    ],
  },
  {
    icon: Server,
    title: "Data Centre Operations",
    subtitle: "Predict failures and cooling issues before they happen",
    bullets: [
      "Monitor PUE, cooling efficiency, and power chains",
      "Simulate failure scenarios and recovery playbooks",
      "Optimize rack placement and thermal zones",
    ],
  },
  {
    icon: Cpu,
    title: "AI Infra Lead / MLOps",
    subtitle: "Right-size GPUs and job routing by scenario",
    bullets: [
      "Model GPU cluster sizing for training workloads",
      "Simulate job scheduling under power constraints",
      "Balance cost, latency, and carbon per inference",
    ],
  },
];

export function TwinUseCases() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Built for Every Stakeholder
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            From executive strategy to hands-on operations, the Twin Studio serves your entire organization.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {personas.map((persona, index) => (
            <Card 
              key={index}
              className="bg-slate-800/30 border-slate-700/50 hover:border-primary/50 transition-colors"
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <persona.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {persona.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {persona.subtitle}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {persona.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="flex items-start gap-2 text-sm text-slate-300">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
