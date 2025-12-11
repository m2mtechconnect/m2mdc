/**
 * TwinDifferentiators - Why we're different section
 * Uses M2M brand design tokens from index.css
 */

import { Shield, Box, Leaf, Cpu, Check } from "lucide-react";
import { motion } from "framer-motion";

const differentiators = [
  {
    icon: Shield,
    title: "Sovereignty-First Digital Twin",
    description: "Built from the ground up for Canadian and EU data residency requirements.",
  },
  {
    icon: Box,
    title: "3D Visualization + Simulation in One UI",
    description: "See your data centre in 3D and run what-if scenarios without switching tools.",
  },
  {
    icon: Leaf,
    title: "Green vs Brown Build Economics",
    description: "Compare renewable and carbon-intensive options with one click.",
  },
  {
    icon: Cpu,
    title: "Subsystem Agents for Every Domain",
    description: "Autonomous agents for power, cooling, GPUs, workload, and carbon optimization.",
  },
];

const capabilities = [
  "Real-time PUE monitoring",
  "Carbon cost modeling",
  "GPU workload simulation",
  "Cooling optimization",
  "Sovereignty scoring",
  "Compliance audits",
  "Energy mix analysis",
  "Failure scenario testing",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, x: -30, scale: 0.95 } as const,
  visible: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.4 },
  },
};

export function TwinDifferentiators() {
  return (
    <section className="py-16 lg:py-24 bg-muted/50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
            Why Organizations Choose Our Platform
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Purpose-built for sovereign, sustainable AI infrastructure — not retrofitted from generic tools.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-2 gap-8"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {differentiators.map((diff, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.02, 
                x: 5,
                transition: { duration: 0.2 }
              }}
              className="flex gap-4 p-6 bg-card/30 rounded-xl border border-border/50 hover:border-primary/50 transition-colors cursor-default group"
            >
              <div className="flex-shrink-0">
                <motion.div 
                  className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors"
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <diff.icon className="h-6 w-6 text-primary" />
                </motion.div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                  {diff.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {diff.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Additional comparison points */}
        <motion.div 
          className="mt-12 p-6 bg-card/20 rounded-xl border border-border/50"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">
            Key Platform Capabilities
          </h3>
          <motion.div 
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {capabilities.map((cap, index) => (
              <motion.div 
                key={index} 
                className="flex items-center gap-2 text-sm text-muted-foreground group cursor-default"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
                whileHover={{ x: 3 }}
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className="h-4 w-4 text-success flex-shrink-0" />
                </motion.div>
                <span className="group-hover:text-foreground transition-colors">{cap}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
