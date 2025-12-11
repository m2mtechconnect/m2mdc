/**
 * TwinIntegrationsGrid - Integration logos and ecosystem section
 * Uses M2M brand design tokens from index.css
 */

import { Cloud, Cpu, Server, Gauge } from "lucide-react";
import { motion } from "framer-motion";

const integrations = [
  { name: "AWS", description: "Cloud telemetry", icon: Cloud },
  { name: "Azure", description: "Cloud monitoring", icon: Cloud },
  { name: "Google Cloud", description: "GCP metrics", icon: Cloud },
  { name: "NVIDIA", description: "GPU fleet management", icon: Cpu },
  { name: "Nlyte / Sunbird", description: "DCIM data feed", icon: Server },
  { name: "Schneider", description: "EcoStruxure", icon: Gauge },
  { name: "M2M AURA", description: "Agentic Studio", icon: Server },
  { name: "Carbon APIs", description: "Emissions tracking", icon: Gauge },
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
  hidden: { opacity: 0, y: 30, scale: 0.9 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4 },
  },
};

export function TwinIntegrationsGrid() {
  return (
    <section className="py-16 lg:py-24 bg-background overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
            Connect to Your Existing Stack
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Ingest metrics from DCIM, cloud, GPU platforms, and sustainability APIs. 
            Enrich with AI-driven modeling.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {integrations.map((integration, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.05, 
                y: -5,
                transition: { duration: 0.2 }
              }}
              className="group flex flex-col items-center p-6 bg-card/30 rounded-xl border border-border/50 hover:border-primary/50 hover:bg-card/50 transition-colors cursor-default"
            >
              <motion.div 
                className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"
                whileHover={{ rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.4 }}
              >
                <integration.icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
              </motion.div>
              <div className="text-center">
                <div className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {integration.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {integration.description}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
