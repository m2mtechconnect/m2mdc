/**
 * TwinHero - Hero section for Data Centre Twin landing page
 * Premium enterprise design with center-aligned layout, power stats, and real product screenshots
 * Uses M2M brand design tokens from index.css
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Play, CheckCircle2, Sparkles, TrendingUp, Zap, Leaf, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";

// Power stats - achieved results, not targets
const powerStats = [
  { value: "1.28", label: "Avg PUE Achieved", icon: TrendingUp, color: "text-success" },
  { value: "89%", label: "GPU Utilization", icon: Zap, color: "text-warning" },
  { value: "28", label: "gCO₂/kWh Avg", icon: Leaf, color: "text-success" },
  { value: "50+", label: "Enterprises", icon: Building2, color: "text-primary" },
];

const trustedLogos = [
  { name: "Scale AI", highlight: true },
  { name: "Upskill Canada", highlight: false },
  { name: "NRC IRAP", highlight: false },
  { name: "Enterprise DC Ops", highlight: false },
];

const quickBenefits = [
  "Canadian data sovereignty",
  "Real-time KPI monitoring",
  "Scenario simulation",
];

export function TwinHero() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  // Mouse follow effect for premium parallax
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 50, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 50, damping: 20 });
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const y = (e.clientY - rect.top - rect.height / 2) / rect.height;
        mouseX.set(x * 20);
        mouseY.set(y * 20);
        setMousePosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);

  return (
    <section 
      ref={containerRef}
      className="relative min-h-[95vh] flex items-center overflow-hidden bg-gradient-to-br from-background via-background to-muted/30"
    >
      {/* Premium animated gradient mesh background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
        
        {/* Mouse-follow spotlight effect */}
        <motion.div 
          className="absolute w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl pointer-events-none"
          style={{
            left: mousePosition.x - 300,
            top: mousePosition.y - 300,
          }}
          animate={{ 
            opacity: [0.03, 0.06, 0.03],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        
        <motion.div 
          className="absolute top-0 right-0 w-[60%] h-[70%] bg-gradient-to-bl from-primary/8 via-primary/5 to-transparent rounded-full blur-3xl"
          style={{ x: springX, y: springY }}
          animate={{ 
            scale: [1, 1.1, 1],
            opacity: [0.08, 0.12, 0.08],
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
        {/* Power Stats Bar - Above headline like Linear/Vercel */}
        <motion.div 
          className="flex flex-wrap justify-center gap-6 lg:gap-10 mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {powerStats.map((stat, i) => (
            <motion.div 
              key={stat.label}
              className="flex items-center gap-3 px-4 py-2 rounded-full bg-card/40 backdrop-blur-sm border border-border/30"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Center-aligned hero content */}
        <div className="text-center max-w-4xl mx-auto mb-16">
          {/* Eyebrow badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-6"
          >
            <Badge 
              variant="outline" 
              className="border-primary/40 text-primary bg-primary/5 px-4 py-1.5 text-sm font-medium"
            >
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              Enterprise Digital Twin Platform
            </Badge>
          </motion.div>
          
          {/* Main headline - centered with gradient */}
          <motion.h1 
            className="font-display text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-slate-900 leading-[1.1] tracking-tight mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Live Digital Twin of Your{" "}
            <span className="relative inline-block">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
                AI Data Centre
              </span>
              <motion.span 
                className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.8, delay: 0.9 }}
              />
            </span>
          </motion.h1>
          
          <motion.p 
            className="text-lg lg:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            View real-time Power Usage Effectiveness (PUE), GPU Utilization, Carbon Intensity, 
            and Sovereignty Status in a single operational dashboard.
          </motion.p>

          {/* Quick benefits - centered */}
          <motion.div 
            className="flex flex-wrap justify-center gap-4 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            {quickBenefits.map((benefit, i) => (
              <motion.div 
                key={benefit}
                className="flex items-center gap-2 text-sm text-muted-foreground"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.7 + i * 0.1 }}
              >
                <CheckCircle2 className="h-4 w-4 text-success" />
                <span>{benefit}</span>
              </motion.div>
            ))}
          </motion.div>

          {/* CTA buttons - centered with premium styling */}
          <motion.div 
            className="flex flex-col sm:flex-row justify-center gap-4 mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                size="lg" 
                className="text-base px-10 h-14 group relative overflow-hidden transition-all duration-300 bg-accent text-accent-foreground hover:bg-accent/90 hover:shadow-2xl hover:shadow-accent/30"
                onClick={() => navigate("/auth")}
              >
                <span className="relative z-10 flex items-center">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
              </Button>
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-10 h-14 border-border text-foreground hover:bg-muted/80 transition-all duration-300"
                onClick={() => navigate("/dashboard")}
              >
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Button>
            </motion.div>
          </motion.div>

          {/* Trust logos - centered */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-4">
              Trusted by industry leaders
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-2">
              {trustedLogos.map((logo, i) => (
                <motion.span 
                  key={logo.name}
                  className={`text-sm font-medium transition-colors ${logo.highlight ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 1 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {logo.name}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Hero visual - Full width product screenshot */}
        <motion.div 
          className="relative max-w-5xl mx-auto"
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
          style={{ x: springX, y: springY }}
        >
          {/* Main product screenshot with premium frame */}
          <motion.div 
            className="relative bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-sm rounded-2xl lg:rounded-3xl border border-border/40 p-2 shadow-2xl shadow-black/20"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.4 }}
          >
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30 rounded-t-xl lg:rounded-t-2xl">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-background/60 rounded-lg px-4 py-1.5 text-xs text-muted-foreground text-center max-w-sm mx-auto border border-border/30">
                  twin-studio.m2mtechconnect.com/dashboard
                </div>
              </div>
            </div>

            {/* Screenshot content - Use real dashboard screenshot */}
            <div className="aspect-[16/9] bg-gradient-to-br from-muted/80 via-muted/50 to-background rounded-b-xl lg:rounded-b-2xl overflow-hidden relative">
              <img 
                src="/landing/screenshots/dashboard-desktop.png" 
                alt="M2M Digital Twin Dashboard showing 3D rack visualization, PUE metrics, GPU utilization, and carbon intensity KPIs"
                className="w-full h-full object-cover object-top"
                loading="eager"
              />
              
              {/* Gradient overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent pointer-events-none" />
            </div>
          </motion.div>

          {/* Floating stat cards with parallax */}
          <motion.div 
            className="absolute -bottom-6 -left-6 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl"
            initial={{ opacity: 0, y: 20, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.5, delay: 1.2 }}
            whileHover={{ scale: 1.05, y: -4 }}
            style={{ x: useTransform(springX, v => v * -0.5), y: useTransform(springY, v => v * -0.5) }}
          >
            <div className="text-3xl font-bold text-success">6,970</div>
            <div className="text-xs text-muted-foreground">Hours saved monthly</div>
          </motion.div>
          
          <motion.div 
            className="absolute -top-6 -right-6 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-4 shadow-xl"
            initial={{ opacity: 0, y: -20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.5, delay: 1.3 }}
            whileHover={{ scale: 1.05, y: 4 }}
            style={{ x: useTransform(springX, v => v * 0.5), y: useTransform(springY, v => v * 0.5) }}
          >
            <div className="text-3xl font-bold text-primary">+32%</div>
            <div className="text-xs text-muted-foreground">Efficiency gains</div>
          </motion.div>

          {/* Side floating card */}
          <motion.div 
            className="absolute top-1/2 -right-8 transform -translate-y-1/2 bg-card/95 backdrop-blur-sm rounded-xl border border-border/50 p-3 shadow-lg hidden xl:block"
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
    </section>
  );
}
