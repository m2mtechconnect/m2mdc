/**
 * TwinStatsBand - Full-width metrics/ROI band
 */

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Zap, Leaf, Clock } from "lucide-react";

const stats = [
  {
    icon: TrendingUp,
    value: "18–24%",
    label: "Projected ROI Impact",
    color: "text-emerald-400",
  },
  {
    icon: Zap,
    value: "30–50%",
    label: "Energy Cost Reduction Potential",
    color: "text-amber-400",
  },
  {
    icon: Leaf,
    value: "Up to 70%",
    label: "Renewable Energy Mix",
    color: "text-green-400",
  },
  {
    icon: Clock,
    value: "20+",
    label: "Hours Saved Weekly per DC Engineer",
    color: "text-blue-400",
  },
];

export function TwinStatsBand() {
  return (
    <section className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 py-16 border-y border-slate-700/50">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Measurable Impact on Your Operations
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Real results from organizations optimizing their data centre infrastructure with our digital twin platform.
          </p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card 
              key={index} 
              className="bg-slate-800/50 border-slate-700/50 hover:border-primary/50 transition-colors"
            >
              <CardContent className="p-6 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-slate-700/50 mb-4">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className={`text-3xl lg:text-4xl font-bold mb-2 ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-sm text-slate-400">
                  {stat.label}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
