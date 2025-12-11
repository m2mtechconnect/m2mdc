/**
 * TwinIntegrationsGrid - Integration logos and ecosystem section
 * Inspired by Monday.com's clean icon grid and Deloitte's ecosystem visualization
 * Uses M2M brand design tokens from index.css
 */

import { Cloud, Cpu, Server, Gauge, Database, Zap, BarChart3, Shield } from "lucide-react";
import { motion } from "framer-motion";

const integrations = [
  { name: "AWS", description: "Cloud telemetry", icon: Cloud, category: "cloud" },
  { name: "Azure", description: "Cloud monitoring", icon: Cloud, category: "cloud" },
  { name: "Google Cloud", description: "GCP metrics", icon: Cloud, category: "cloud" },
  { name: "NVIDIA", description: "GPU fleet management", icon: Cpu, category: "compute" },
  { name: "Nlyte / Sunbird", description: "DCIM data feed", icon: Server, category: "dcim" },
  { name: "Schneider", description: "EcoStruxure", icon: Gauge, category: "dcim" },
  { name: "M2M AURA", description: "Agentic Studio", icon: Zap, category: "platform" },
  { name: "Carbon APIs", description: "Emissions tracking", icon: BarChart3, category: "sustainability" },
];

const categories = [
  { key: "cloud", label: "Cloud Providers", color: "text-info" },
  { key: "compute", label: "Compute", color: "text-warning" },
  { key: "dcim", label: "DCIM", color: "text-success" },
  { key: "platform", label: "Platform", color: "text-primary" },
  { key: "sustainability", label: "Sustainability", color: "text-success" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.95 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4 },
  },
};

export function TwinIntegrationsGrid() {
  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 via-background to-background overflow-hidden">
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
              Ecosystem
            </span>
          </motion.div>
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Connect to Your Existing Stack
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ingest metrics from DCIM, cloud, GPU platforms, and sustainability APIs. 
            Enrich with AI-driven modeling and optimization.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {integrations.map((integration, index) => {
            const category = categories.find(c => c.key === integration.category);
            
            return (
              <motion.div 
                key={index}
                variants={itemVariants}
                whileHover={{ 
                  scale: 1.04, 
                  y: -4,
                  transition: { duration: 0.2 }
                }}
                className="group flex flex-col items-center p-6 bg-card/50 rounded-2xl border border-border/40 hover:border-primary/40 hover:bg-card/80 hover:shadow-lg transition-all cursor-default"
              >
                <motion.div 
                  className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-all"
                  whileHover={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <integration.icon className={`h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors`} />
                </motion.div>
                <div className="text-center">
                  <div className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {integration.name}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {integration.description}
                  </div>
                  {category && (
                    <span className={`text-[10px] uppercase tracking-wider ${category.color} opacity-70`}>
                      {category.label}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Additional integrations note */}
        <motion.div 
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">50+</span> integrations available • 
            Custom connectors supported • 
            <span className="font-medium text-foreground"> REST & GraphQL APIs</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
}
