/**
 * TwinCTASection - Bottom CTA section
 */

import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function TwinCTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto px-4 lg:px-8 text-center">
        {/* Decorative element */}
        <div className="w-16 h-1 bg-gradient-to-r from-primary to-emerald-400 mx-auto mb-8 rounded-full" />
        
        <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
          Ready to Build Your Sovereign AI Data Centre Twin?
        </h2>
        
        <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          Get a guided demo of the Twin Studio and see your environment modeled in days, not months.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4">
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
            asChild
          >
            <a href="mailto:info@m2mtechconnect.com">
              <Mail className="mr-2 h-5 w-5" />
              Talk to Our Team
            </a>
          </Button>
        </div>
        
        {/* No pricing / signup note */}
        <p className="mt-8 text-sm text-slate-500">
          No credit card required. Enterprise pricing available.
        </p>
      </div>
    </section>
  );
}
