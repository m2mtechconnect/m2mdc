/**
 * TwinHero - Hero section for Data Centre Twin landing page
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TwinHero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-20 lg:py-32">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <div className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
      
      <div className="relative max-w-6xl mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                Enterprise Digital Twin Platform
              </Badge>
              
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold text-white leading-tight">
                Sovereign Green AI{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400">
                  Data Centre Twin
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-slate-300 leading-relaxed max-w-xl">
                Design, simulate, and optimize AI-ready data centres with full sovereignty, 
                carbon intelligence, and real-time operational visibility.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="text-base px-8"
                onClick={() => navigate("/contact")}
              >
                Request a Demo
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 border-slate-600 text-slate-200 hover:bg-slate-800"
                onClick={() => navigate("/dashboard")}
              >
                <Play className="mr-2 h-5 w-5" />
                Explore the Studio
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4">
              <div className="text-sm text-slate-400">Trusted by</div>
              <div className="flex items-center gap-4 text-slate-500">
                <span className="font-medium">Scale AI</span>
                <span className="text-slate-600">•</span>
                <span className="font-medium">Upskill Canada</span>
                <span className="text-slate-600">•</span>
                <span className="font-medium">Enterprise DC Ops</span>
              </div>
            </div>
          </div>

          {/* Right: Hero visual */}
          <div className="relative">
            <div className="relative bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-4 shadow-2xl">
              {/* Mock screenshot placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg overflow-hidden relative">
                <img 
                  src="/assets/landing/twin-hero.png" 
                  alt="3D sovereign data centre twin overview"
                  className="w-full h-full object-cover opacity-90"
                  onError={(e) => {
                    // Fallback to gradient if image not found
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Overlay mock UI elements */}
                <div className="absolute inset-0 flex items-end p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-emerald-500/90 text-white border-0">
                      PUE 1.33
                    </Badge>
                    <Badge className="bg-blue-500/90 text-white border-0">
                      1075 kW
                    </Badge>
                    <Badge className="bg-amber-500/90 text-white border-0">
                      30 gCO₂
                    </Badge>
                    <Badge className="bg-primary/90 text-white border-0">
                      85% renewable
                    </Badge>
                  </div>
                </div>

                {/* Decorative grid overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
              </div>
              
              {/* Window controls decoration */}
              <div className="absolute top-2 left-6 flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
            </div>

            {/* Floating stats cards */}
            <div className="absolute -bottom-6 -left-6 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-3 shadow-xl">
              <div className="text-2xl font-bold text-emerald-400">98.7%</div>
              <div className="text-xs text-slate-400">Uptime SLA</div>
            </div>
            
            <div className="absolute -top-4 -right-4 bg-slate-800/90 backdrop-blur-sm rounded-lg border border-slate-700/50 p-3 shadow-xl">
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-xs text-slate-400">Monitoring</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
