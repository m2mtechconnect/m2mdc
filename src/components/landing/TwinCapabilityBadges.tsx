/**
 * TwinCapabilityBadges - Horizontal badge row showing key capabilities
 * With scroll-triggered staggered animations
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
  { icon: Shield, label: "Sovereign Compute (Canada / EU)" },
  { icon: Leaf, label: "Green AI Infrastructure" },
  { icon: Box, label: "Digital Twin Simulation" },
  { icon: FileCheck, label: "OSFI / HIPAA / PIPEDA Ready" },
  { icon: Cpu, label: "GPU & Cooling Optimization" },
  { icon: DollarSign, label: "Carbon & Cost Modeling" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.9 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4 },
  },
};

export function TwinCapabilityBadges() {
  return (
    <section className="bg-slate-900/50 border-y border-slate-800 py-8">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <motion.div 
          className="flex flex-wrap justify-center gap-4 lg:gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {capabilities.map((cap, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05, 
                borderColor: "hsl(var(--primary))",
                transition: { duration: 0.2 }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-full border border-slate-700/50 text-sm text-slate-300 hover:text-primary cursor-default transition-colors"
            >
              <cap.icon className="h-4 w-4 text-primary" />
              <span>{cap.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
