/**
 * TwinTrustSection - Trust & sovereignty section
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Badge } from "@/components/ui/badge";
import { Shield, Globe, Lock, Server, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const regions = [
  { label: "Canada", flag: "🇨🇦" },
  { label: "European Union", flag: "🇪🇺" },
  { label: "Government & Regulated", flag: "🏛️" },
  { label: "Financial Services", flag: "🏦" },
  { label: "Healthcare", flag: "🏥" },
];

const trustPoints = [
  {
    icon: Globe,
    title: "Data Residency Mapping",
    description: "View data residency status by region and jurisdiction in the Sovereignty panel. Displayed as a map with zone indicators.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Shield,
    title: "Sovereignty Score",
    description: "Sovereignty Score displayed as a percentage in the dashboard. Breakdown available by compute, storage, and network categories.",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Lock,
    title: "Compliance Indicators",
    description: "Compliance status for OSFI, HIPAA, and PIPEDA shown as indicators in the Sovereignty & Safety Audit panel.",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Server,
    title: "Canadian Cloud Regions",
    description: "Region selection available in Blueprint Designer including ca-central-1 (Montreal) and ca-west-1 (Calgary) options.",
    color: "text-info",
    bgColor: "bg-info/10",
  },
];

const certifications = [
  "SOC 2 Type II",
  "ISO 27001",
  "PIPEDA Compliant",
  "OSFI Ready",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4 },
  },
};

export function TwinTrustSection() {
  return (
    <section className="py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-background via-muted/10 to-background">
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
            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              Enterprise Trust
            </span>
          </motion.div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Sovereignty & Compliance Features
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            Compliance indicators and data residency tracking displayed in the Sovereignty & Safety Audit panel.
          </p>
          
          {/* Region badges */}
          <motion.div 
            className="flex flex-wrap justify-center gap-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {regions.map((region, index) => (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ duration: 0.2 }}
              >
                <Badge 
                  variant="outline" 
                  className="px-4 py-2.5 text-sm border-border bg-card/60 text-foreground cursor-default hover:border-primary/40 hover:bg-card transition-all"
                >
                  <span className="mr-2">{region.flag}</span>
                  {region.label}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-2 gap-5 mb-14"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {trustPoints.map((point, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              whileHover={{ 
                scale: 1.02,
                transition: { duration: 0.2 }
              }}
              className="relative flex gap-4 p-6 bg-card/40 rounded-2xl border border-border/40 hover:border-border hover:bg-card/60 transition-all cursor-default group overflow-hidden"
            >
              {/* Accent gradient on hover */}
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${point.bgColor.replace('/10', '/5')}`} />
              
              <div className="relative flex-shrink-0">
                <motion.div 
                  className={`w-12 h-12 rounded-xl ${point.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <point.icon className={`h-6 w-6 ${point.color}`} />
                </motion.div>
              </div>
              <div className="relative">
                <h3 className={`font-semibold text-lg mb-1.5 group-hover:${point.color} transition-colors text-foreground`}>
                  {point.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        

        {/* Trust logos row */}
        <motion.div 
          className="mt-12 pt-8 border-t border-border/30"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <div className="text-center text-sm text-muted-foreground mb-5">
            Recognized by industry leaders
          </div>
          <motion.div 
            className="flex flex-wrap justify-center items-center gap-x-10 gap-y-4"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            {["Scale AI", "Upskill Canada", "NRC IRAP", "Enterprise Partners"].map((name, index) => (
              <motion.span 
                key={name}
                className="text-base font-medium text-muted-foreground/70 hover:text-foreground transition-colors cursor-default"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                {name}
              </motion.span>
            ))}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
