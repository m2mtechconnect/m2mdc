/**
 * TwinTrustSection - Trust & sovereignty section
 * With scroll-triggered animations
 */

import { Badge } from "@/components/ui/badge";
import { Shield, Globe, Lock, Server } from "lucide-react";
import { motion } from "framer-motion";

const regions = [
  "Canada",
  "EU",
  "Government & Regulated",
  "Financial Services",
  "Healthcare",
];

const trustPoints = [
  {
    icon: Globe,
    title: "Data Residency",
    description: "Your data stays in your chosen jurisdiction. Full control over where compute and storage reside.",
  },
  {
    icon: Shield,
    title: "Sovereign Regions",
    description: "Deploy to certified sovereign cloud regions in Canada, EU, and regulated environments.",
  },
  {
    icon: Lock,
    title: "Compliance-First Architecture",
    description: "Built to meet OSFI, HIPAA, PIPEDA, and industry-specific regulatory requirements.",
  },
  {
    icon: Server,
    title: "On-Premises Options",
    description: "Hybrid deployment models for organizations requiring air-gapped or on-prem infrastructure.",
  },
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
  hidden: { opacity: 0, y: 20, scale: 0.95 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4 },
  },
};

export function TwinTrustSection() {
  return (
    <section className="py-16 lg:py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 lg:px-8">
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl lg:text-3xl font-bold text-white mb-3">
            Built for Regulated, Sovereign AI Infrastructure
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto mb-8">
            Trusted by organizations that cannot compromise on data sovereignty, security, and compliance.
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
                  className="px-4 py-2 text-sm border-primary/50 text-primary bg-primary/10 cursor-default"
                >
                  {region}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-2 gap-6"
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
              className="flex gap-4 p-6 bg-slate-800/20 rounded-xl border border-slate-700/50 hover:border-primary/50 transition-colors cursor-default group"
            >
              <div className="flex-shrink-0">
                <motion.div 
                  className="w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center group-hover:bg-primary/20 transition-colors"
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <point.icon className="h-5 w-5 text-primary" />
                </motion.div>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1 group-hover:text-primary transition-colors">
                  {point.title}
                </h3>
                <p className="text-sm text-slate-400">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Trust logos row */}
        <motion.div 
          className="mt-12 pt-8 border-t border-slate-800"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="text-center text-sm text-slate-500 mb-4">
            Recognized by industry leaders
          </div>
          <motion.div 
            className="flex flex-wrap justify-center items-center gap-8 text-slate-600"
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {["Scale AI", "Upskill Canada", "IRAP", "NRC"].map((name, index) => (
              <motion.span 
                key={name}
                className="font-medium hover:text-slate-400 transition-colors cursor-default"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.1 }}
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
