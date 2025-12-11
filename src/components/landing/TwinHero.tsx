/**
 * TwinHero - Hero section for Data Centre Twin landing page
 * Uses M2M brand design tokens from index.css
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

export function TwinHero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden bg-background py-20 lg:py-32">
      {/* Animated background decoration */}
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5" />
      <motion.div 
        className="absolute top-1/4 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div 
        className="absolute bottom-0 left-1/4 w-64 h-64 bg-success/10 rounded-full blur-3xl"
        animate={{ 
          scale: [1, 1.3, 1],
          opacity: [0.1, 0.2, 0.1]
        }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />
      
      <div className="relative max-w-6xl mx-auto px-4 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text content */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Badge variant="outline" className="border-primary/50 text-primary bg-primary/10">
                  Enterprise Digital Twin Platform
                </Badge>
              </motion.div>
              
              <motion.h1 
                className="text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Sovereign Green AI{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-success">
                  Data Centre Twin
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Design, simulate, and optimize AI-ready data centres with full sovereignty, 
                carbon intelligence, and real-time operational visibility.
              </motion.p>
            </div>

            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Button 
                size="lg" 
                className="text-base px-8 group transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/25"
                onClick={() => navigate("/contact")}
              >
                Request a Demo
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 border-border text-foreground hover:bg-muted transition-all duration-300 hover:scale-105"
                onClick={() => navigate("/dashboard")}
              >
                <Play className="mr-2 h-5 w-5" />
                Explore the Studio
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div 
              className="flex items-center gap-6 pt-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.7 }}
            >
              <div className="text-sm text-muted-foreground">Trusted by</div>
              <div className="flex items-center gap-4 text-muted-foreground/70">
                <span className="font-medium">Scale AI</span>
                <span className="text-border">•</span>
                <span className="font-medium">Upskill Canada</span>
                <span className="text-border">•</span>
                <span className="font-medium">Enterprise DC Ops</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Hero visual */}
          <motion.div 
            className="relative"
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            <motion.div 
              className="relative bg-card/50 backdrop-blur-sm rounded-2xl border border-border/50 p-4 shadow-2xl"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              {/* Mock screenshot placeholder */}
              <div className="aspect-[4/3] bg-gradient-to-br from-muted to-background rounded-lg overflow-hidden relative">
                <img 
                  src="/assets/landing/twin-hero.png" 
                  alt="3D sovereign data centre twin overview"
                  className="w-full h-full object-cover opacity-90"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Overlay mock UI elements */}
                <motion.div 
                  className="absolute inset-0 flex items-end p-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8 }}
                >
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: "PUE 1.33", color: "bg-success/90" },
                      { label: "1075 kW", color: "bg-info/90" },
                      { label: "30 gCO₂", color: "bg-warning/90" },
                      { label: "85% renewable", color: "bg-primary/90" },
                    ].map((badge, i) => (
                      <motion.div
                        key={badge.label}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.9 + i * 0.1 }}
                      >
                        <Badge className={`${badge.color} text-primary-foreground border-0`}>
                          {badge.label}
                        </Badge>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Decorative grid overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
              </div>
              
              {/* Window controls decoration */}
              <div className="absolute top-2 left-6 flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/80" />
                <div className="w-3 h-3 rounded-full bg-warning/80" />
                <div className="w-3 h-3 rounded-full bg-success/80" />
              </div>
            </motion.div>

            {/* Floating stats cards */}
            <motion.div 
              className="absolute -bottom-6 -left-6 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 p-3 shadow-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1 }}
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <div className="text-2xl font-bold text-success">98.7%</div>
              <div className="text-xs text-muted-foreground">Uptime SLA</div>
            </motion.div>
            
            <motion.div 
              className="absolute -top-4 -right-4 bg-card/90 backdrop-blur-sm rounded-lg border border-border/50 p-3 shadow-xl"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.1 }}
              whileHover={{ scale: 1.05, y: 2 }}
            >
              <div className="text-2xl font-bold text-primary">24/7</div>
              <div className="text-xs text-muted-foreground">Monitoring</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
