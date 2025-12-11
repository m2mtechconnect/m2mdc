/**
 * TwinTrustSection - Trust & sovereignty section
 */

import { Badge } from "@/components/ui/badge";
import { Shield, Globe, Lock, Server } from "lucide-react";

const regions = [
  "Canada",
  "EU",
  "Government & Regulated",
  "Financial Services",
  "Healthcare",
];

const trustPoints = [
  {
    icon: Globe,
    title: "Data Residency",
    description: "Your data stays in your chosen jurisdiction. Full control over where compute and storage reside.",
  },
  {
    icon: Shield,
    title: "Sovereign Regions",
    description: "Deploy to certified sovereign cloud regions in Canada, EU, and regulated environments.",
  },
  {
    icon: Lock,
    title: "Compliance-First Architecture",
    description: "Built to meet OSFI, HIPAA, PIPEDA, and industry-specific regulatory requirements.",
  },
  {
    icon: Server,
    title: "On-Premises Options",
    description: "Hybrid deployment models for organizations requiring air-gapped or on-prem infrastructure.",
  },
];

export function TwinTrustSection() {
  return (
    <section className="py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Built for Regulated, Sovereign AI Infrastructure
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8">
            Trusted by organizations that cannot compromise on data sovereignty, security, and compliance.
          </p>
          
          {/* Region badges */}
          <div className="flex flex-wrap justify-center gap-3">
            {regions.map((region, index) => (
              <Badge 
                key={index}
                variant="outline" 
                className="px-4 py-2 text-sm border-primary/50 text-primary bg-primary/10"
              >
                {region}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          {trustPoints.map((point, index) => (
            <div 
              key={index}
              className="flex gap-4 p-6 bg-slate-800/20 rounded-xl border border-slate-700/50"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                  <point.icon className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">
                  {point.title}
                </h3>
                <p className="text-sm text-slate-400">
                  {point.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        {/* Trust logos row */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="text-center text-sm text-slate-500 mb-4">
            Recognized by industry leaders
          </div>
          <div className="flex flex-wrap justify-center items-center gap-8 text-slate-600">
            <span className="font-medium">Scale AI</span>
            <span className="text-slate-700">•</span>
            <span className="font-medium">Upskill Canada</span>
            <span className="text-slate-700">•</span>
            <span className="font-medium">IRAP</span>
            <span className="text-slate-700">•</span>
            <span className="font-medium">NRC</span>
          </div>
        </div>
      </div>
    </section>
  );
}
