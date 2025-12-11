/**
 * TwinDifferentiators - Why we're different section
 * Inspired by Monday.com's expandable cards with metric reveals
 * Uses M2M brand design tokens from index.css
 */

import { Shield, Box, Leaf, Cpu, Check, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

interface Differentiator {
  icon: typeof Shield;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
  colorClass: string;
  bgClass: string;
}

const differentiators: Differentiator[] = [
  {
    icon: Shield,
    title: "Sovereignty-First Digital Twin",
    description: "Built from the ground up for Canadian and EU data residency requirements. Full control over where compute and storage reside.",
    metric: "100%",
    metricLabel: "Data residency compliance",
    colorClass: "text-primary",
    bgClass: "bg-primary/10 hover:bg-primary/20",
  },
  {
    icon: Box,
    title: "3D Visualization + Simulation",
    description: "See your data centre in 3D and run what-if scenarios without switching tools. Real-time thermal, power, and workload modeling.",
    metric: "50+",
    metricLabel: "Simulation scenarios",
    colorClass: "text-info",
    bgClass: "bg-info/10 hover:bg-info/20",
  },
  {
    icon: Leaf,
    title: "Green vs Brown Economics",
    description: "Compare renewable and carbon-intensive options with one click. Full carbon accounting with Scope 2 and Scope 3 emissions.",
    metric: "70%",
    metricLabel: "Carbon reduction potential",
    colorClass: "text-success",
    bgClass: "bg-success/10 hover:bg-success/20",
  },
  {
    icon: Cpu,
    title: "Subsystem Agents for Every Domain",
    description: "Autonomous agents for power, cooling, GPUs, workload, and carbon optimization. 24/7 monitoring with proactive alerts.",
    metric: "9",
    metricLabel: "Specialized AI agents",
    colorClass: "text-warning",
    bgClass: "bg-warning/10 hover:bg-warning/20",
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
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

function DifferentiatorCard({ diff, index }: { diff: Differentiator; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -30 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className={`relative overflow-hidden rounded-2xl border border-border/50 transition-all duration-500 cursor-pointer group ${
        isExpanded ? 'bg-card shadow-xl' : 'bg-card/30 hover:bg-card/50'
      }`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      style={{
        minHeight: isExpanded ? '240px' : '160px',
      }}
    >
      {/* Colored accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${diff.bgClass.replace('/10', '/60').replace('/20', '/80')}`} />
      
      <div className="p-6 pl-8">
        <div className="flex items-start gap-4">
          <motion.div 
            className={`flex-shrink-0 w-12 h-12 rounded-xl ${diff.bgClass} flex items-center justify-center transition-colors`}
            animate={{ rotate: isExpanded ? [0, -5, 5, 0] : 0 }}
            transition={{ duration: 0.4 }}
          >
            <diff.icon className={`h-6 w-6 ${diff.colorClass}`} />
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold mb-2 transition-colors ${isExpanded ? diff.colorClass : 'text-foreground group-hover:' + diff.colorClass}`}>
              {diff.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {diff.description}
            </p>
          </div>
        </div>

        {/* Expanded metric reveal */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className={`p-4 rounded-xl ${diff.bgClass} flex items-center justify-between`}>
                <div>
                  <div className={`text-3xl font-bold ${diff.colorClass}`}>
                    {diff.metric}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {diff.metricLabel}
                  </div>
                </div>
                <ArrowRight className={`h-5 w-5 ${diff.colorClass}`} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

export function TwinDifferentiators() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-background via-muted/20 to-background overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <motion.div 
          className="text-center mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="inline-block mb-4"
          >
            <span className="px-4 py-1.5 rounded-full bg-muted text-foreground text-sm font-medium">
              The M2M Difference
            </span>
          </motion.div>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Why Organizations Choose Us
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Purpose-built for sovereign, sustainable AI infrastructure — not retrofitted from generic tools.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 gap-6 mb-14">
          {differentiators.map((diff, index) => (
            <DifferentiatorCard key={index} diff={diff} index={index} />
          ))}
        </div>
        
        {/* Capabilities grid */}
        <motion.div 
          className="p-8 bg-card/40 rounded-2xl border border-border/50"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-xl font-semibold text-foreground mb-6 text-center">
            Platform Capabilities
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
                className="flex items-center gap-3 text-sm text-muted-foreground group cursor-default p-2 rounded-lg hover:bg-muted/50 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.4 + index * 0.04 }}
                whileHover={{ x: 3 }}
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <Check className="h-4 w-4 text-success" />
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
