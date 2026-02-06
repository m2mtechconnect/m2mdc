/**
 * TwinStatsBand - Full-width metrics/ROI band with PLATFORM CAPABILITIES
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Zap, Leaf, Clock, Target } from "lucide-react";
import { motion } from "framer-motion";

interface StatCard {
  icon: typeof TrendingUp;
  value: string;
  label: string;
  colorClass: string;
  bgClass: string;
  benchmark?: string;
}

// Platform capabilities with industry benchmarks - not customer claims
const stats: StatCard[] = [
  {
    icon: TrendingUp,
    value: "<1.3",
    label: "Target PUE",
    colorClass: "text-success",
    bgClass: "bg-success/10 group-hover:bg-success/20",
    benchmark: "Industry avg: 1.58",
  },
  {
    icon: Zap,
    value: ">85%",
    label: "GPU Utilization Target",
    colorClass: "text-warning",
    bgClass: "bg-warning/10 group-hover:bg-warning/20",
    benchmark: "Industry avg: 60%",
  },
  {
    icon: Leaf,
    value: "<50",
    label: "gCO₂/kWh Target",
    colorClass: "text-success",
    bgClass: "bg-success/10 group-hover:bg-success/20",
    benchmark: "Industry avg: 400+",
  },
  {
    icon: Clock,
    value: "99.99%",
    label: "Uptime Target",
    colorClass: "text-info",
    bgClass: "bg-info/10 group-hover:bg-info/20",
    benchmark: "Tier IV standard",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5 },
  },
};

function StatCardComponent({ stat, index }: { stat: StatCard; index: number }) {
  return (
    <motion.div variants={cardVariants}>
      <Card className="bg-card/60 border-border/50 hover:border-primary/40 transition-all duration-300 group h-[200px]">
        <CardContent className="h-full flex flex-col items-center justify-center p-6 text-center">
          <motion.div 
            className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${stat.bgClass} mb-4 transition-colors`}
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ duration: 0.2 }}
          >
            <stat.icon className={`h-7 w-7 ${stat.colorClass}`} />
          </motion.div>
          <motion.div 
            className={`text-4xl lg:text-5xl font-bold mb-1 ${stat.colorClass}`}
            initial={{ scale: 0.5, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ 
              duration: 0.5, 
              delay: 0.3 + index * 0.1,
              type: "spring",
              stiffness: 200
            }}
          >
            {stat.value}
          </motion.div>
          
          <div className="text-sm text-muted-foreground font-medium mb-2">
            {stat.label}
          </div>
          
          {stat.benchmark && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground/70">
              <Target className="h-3 w-3" />
              <span>{stat.benchmark}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TwinStatsBand() {
  return (
    <section className="relative py-20 border-y border-border/30 overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-muted/30 via-background to-muted/30" />
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.02]" />
      
      <div className="relative max-w-6xl mx-auto px-4 lg:px-8">
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
            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Platform Capabilities
            </span>
          </motion.div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Designed to Meet Industry Benchmarks
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Target metrics the platform is engineered to help you achieve, 
            compared against industry standards.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {stats.map((stat, index) => (
            <StatCardComponent key={index} stat={stat} index={index} />
          ))}
        </motion.div>

        {/* Bottom trust indicator */}
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
        <p className="text-sm text-muted-foreground">
            📊 Benchmarks based on Uptime Institute and EPA Energy Star standards
          </p>
        </motion.div>
      </div>
    </section>
  );
}
