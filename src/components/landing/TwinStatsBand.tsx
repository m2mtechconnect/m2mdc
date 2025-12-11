/**
 * TwinStatsBand - Full-width metrics/ROI band
 * Uses M2M brand design tokens from index.css
 */

import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Zap, Leaf, Clock } from "lucide-react";
import { motion } from "framer-motion";

const stats = [
  {
    icon: TrendingUp,
    value: "18–24%",
    label: "Projected ROI Impact",
    colorClass: "text-success",
  },
  {
    icon: Zap,
    value: "30–50%",
    label: "Energy Cost Reduction Potential",
    colorClass: "text-warning",
  },
  {
    icon: Leaf,
    value: "Up to 70%",
    label: "Renewable Energy Mix",
    colorClass: "text-success",
  },
  {
    icon: Clock,
    value: "20+",
    label: "Hours Saved Weekly per DC Engineer",
    colorClass: "text-info",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
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

export function TwinStatsBand() {
  return (
    <section className="bg-gradient-to-r from-muted via-card to-muted py-16 border-y border-border/50 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-3">
            Measurable Impact on Your Operations
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Real results from organizations optimizing their data centre infrastructure with our digital twin platform.
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
            <motion.div key={index} variants={cardVariants}>
              <Card 
                className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 group cursor-default"
              >
                <CardContent className="p-6 text-center">
                  <motion.div 
                    className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4 group-hover:bg-muted/80 transition-colors"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    <stat.icon className={`h-6 w-6 ${stat.colorClass}`} />
                  </motion.div>
                  <motion.div 
                    className={`text-3xl lg:text-4xl font-bold mb-2 ${stat.colorClass}`}
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
                  <div className="text-sm text-muted-foreground">
                    {stat.label}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
