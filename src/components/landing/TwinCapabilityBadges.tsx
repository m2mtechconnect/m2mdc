/**
 * TwinCapabilityBadges - Horizontal badge row showing key capabilities
 * Inspired by Monday.com's clean feature pills with interactive hover states
 * Uses M2M brand design tokens from index.css
 */

import { 
  Shield, 
  Leaf, 
  Box, 
  FileCheck, 
  Cpu, 
  DollarSign 
} from "lucide-react";
import { motion } from "framer-motion";

const capabilities = [
  { icon: Shield, label: "Sovereign Compute (Canada / EU)", color: "text-primary", bgHover: "hover:bg-primary/10 hover:border-primary/40" },
  { icon: Leaf, label: "Green AI Infrastructure", color: "text-success", bgHover: "hover:bg-success/10 hover:border-success/40" },
  { icon: Box, label: "Digital Twin Simulation", color: "text-info", bgHover: "hover:bg-info/10 hover:border-info/40" },
  { icon: FileCheck, label: "OSFI / HIPAA / PIPEDA Ready", color: "text-warning", bgHover: "hover:bg-warning/10 hover:border-warning/40" },
  { icon: Cpu, label: "GPU & Cooling Optimization", color: "text-primary", bgHover: "hover:bg-primary/10 hover:border-primary/40" },
  { icon: DollarSign, label: "Carbon & Cost Modeling", color: "text-success", bgHover: "hover:bg-success/10 hover:border-success/40" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35 },
  },
};

export function TwinCapabilityBadges() {
  return (
    <section className="relative bg-muted/30 border-y border-border/40 py-10">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-background/50 to-transparent" />
      
      <div className="relative max-w-7xl mx-auto px-4 lg:px-8">
        <motion.div 
          className="flex flex-wrap justify-center gap-3 lg:gap-4"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-30px" }}
        >
          {capabilities.map((cap, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05, 
                y: -2,
                transition: { duration: 0.2 }
              }}
              className={`group flex items-center gap-2.5 px-5 py-2.5 bg-card/60 backdrop-blur-sm rounded-full border border-border/40 text-sm cursor-default transition-all duration-300 ${cap.bgHover}`}
            >
              <cap.icon className={`h-4 w-4 ${cap.color} transition-transform group-hover:scale-110`} />
              <span className="text-muted-foreground group-hover:text-foreground transition-colors font-medium">
                {cap.label}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
