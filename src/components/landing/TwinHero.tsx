/**
 * TwinHero - Hero section for Data Centre Twin landing page
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CheckCircle2, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const trustedLogos = [
  { name: "Scale AI", highlight: true },
  { name: "Upskill Canada", highlight: false },
  { name: "NRC IRAP", highlight: false },
  { name: "Enterprise DC Ops", highlight: false },
];

const quickBenefits = [
  "Sovereign-first architecture",
  "Carbon & cost modeling",
  "Real-time simulation",
];

export function TwinHero() {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/30">
      {/* Animated gradient mesh background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
        <motion.div 
          className="absolute top-0 right-0 w-[60%] h-[70%] bg-gradient-to-bl from-primary/8 via-primary/5 to-transparent rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.08, 0.12, 0.08],
            x: [0, 20, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-[50%] h-[60%] bg-gradient-to-tr from-success/6 via-success/3 to-transparent rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.15, 1],
            opacity: [0.06, 0.1, 0.06],
            y: [0, -20, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        {/* Subtle accent orb */}
        <motion.div 
          className="absolute top-1/3 left-1/3 w-64 h-64 bg-info/5 rounded-full blur-3xl"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.08, 0.05],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>
      
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8 py-16 lg:py-24 w-full">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left: Text content - 5 columns */}
          <motion.div 
            className="lg:col-span-5 space-y-8"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Eyebrow badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Badge 
                variant="outline" 
                className="border-primary/40 text-primary bg-primary/5 px-4 py-1.5 text-sm font-medium"
              >
                <Sparkles className="h-3.5 w-3.5 mr-2" />
                Enterprise Digital Twin Platform
              </Badge>
            </motion.div>
            
            {/* Main headline - M2M brand typography with Space Grotesk */}
            <div className="space-y-4">
              <motion.h1 
                className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                Design and simulate{" "}
                <span className="relative">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary to-success">
                    sovereign AI data centres
                  </span>
                  <motion.span 
                    className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-primary to-success rounded-full"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.8, delay: 0.8 }}
                  />
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-lg lg:text-xl text-muted-foreground leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                Model, optimize, and deploy AI-ready infrastructure with full sovereignty, 
                carbon intelligence, and real-time operational visibility.
              </motion.p>
            </div>

            {/* Quick benefits - Monday-style checkmarks */}
            <motion.div 
              className="flex flex-wrap gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              {quickBenefits.map((benefit, i) => (
                <motion.div 
                  key={benefit}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.6 + i * 0.1 }}
                >
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>{benefit}</span>
                </motion.div>
              ))}
            </motion.div>

            {/* CTA buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Button 
                size="lg" 
                className="text-base px-8 h-12 group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-primary/20"
                onClick={() => navigate("/contact")}
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8 h-12 border-border text-foreground hover:bg-muted/80 transition-all duration-300"
                onClick={() => navigate("/dashboard")}
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </motion.div>

            {/* Trust logos - Deloitte-style corporate credibility */}
            <motion.div 
              className="pt-6 border-t border-border/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
                Trusted by industry leaders
              </div>
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {trustedLogos.map((logo, i) => (
                  <motion.span 
                    key={logo.name}
                    className={`text-sm font-medium transition-colors ${logo.highlight ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.9 + i * 0.1 }}
                  >
                    {logo.name}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right: Hero visual - 7 columns */}
          <motion.div 
            className="lg:col-span-7 relative"
            initial={{ opacity: 0, x: 40, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          >
            {/* Main product screenshot */}
            <motion.div 
              className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm rounded-2xl border border-border/40 p-2 shadow-2xl shadow-black/10"
              whileHover={{ scale: 1.01 }}
              transition={{ duration: 0.4 }}
            >
              {/* Browser chrome */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-muted/50 rounded-md px-3 py-1 text-xs text-muted-foreground text-center max-w-xs mx-auto">
                    twin-studio.m2mtechconnect.com
                  </div>
                </div>
              </div>

              {/* Screenshot content */}
              <div className="aspect-[16/10] bg-gradient-to-br from-muted/80 via-muted/50 to-background rounded-b-lg overflow-hidden relative">
                <img 
                  src="/assets/landing/twin-hero.png" 
                  alt="3D sovereign data centre twin dashboard showing real-time PUE, carbon metrics, and GPU utilization"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
                
                {/* Overlay metrics badges - Monday-style live data */}
                <motion.div 
                  className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 }}
                >
                  {[
                    { label: "PUE 1.28", color: "bg-success text-success-foreground" },
                    { label: "1,075 kW", color: "bg-info text-info-foreground" },
                    { label: "28 gCO₂/kWh", color: "bg-warning text-warning-foreground" },
                    { label: "92% Renewable", color: "bg-primary text-primary-foreground" },
                  ].map((badge, i) => (
                    <motion.div
                      key={badge.label}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 1.1 + i * 0.1 }}
                    >
                      <Badge className={`${badge.color} border-0 shadow-sm`}>
                        {badge.label}
                      </Badge>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent pointer-events-none" />
              </div>
            </motion.div>

            {/* Floating stat cards - Monday-style emphasis */}
            <motion.div 
              className="absolute -bottom-4 -left-4 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl"
              initial={{ opacity: 0, y: 20, x: -20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <div className="text-3xl font-bold text-success">6,970</div>
              <div className="text-xs text-muted-foreground">Hours saved monthly</div>
            </motion.div>
            
            <motion.div 
              className="absolute -top-4 -right-4 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl"
              initial={{ opacity: 0, y: -20, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ duration: 0.5, delay: 1.3 }}
              whileHover={{ scale: 1.05, y: 2 }}
            >
              <div className="text-3xl font-bold text-primary">+32%</div>
              <div className="text-xs text-muted-foreground">Efficiency gains</div>
            </motion.div>

            {/* Side floating card */}
            <motion.div 
              className="absolute top-1/2 -right-6 transform -translate-y-1/2 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-3 shadow-lg hidden xl:block"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-foreground">Live Monitoring</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
