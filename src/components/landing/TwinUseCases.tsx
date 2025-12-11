/**
 * TwinUseCases - Persona cards showing use cases
 * With scroll-triggered staggered animations
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Leaf, Server, Cpu, Check } from "lucide-react";
import { motion } from "framer-motion";

const personas = [
  {
    icon: Building2,
    title: "CIO / CTO",
    subtitle: "Shape sovereign AI and DC strategy",
    bullets: [
      "Model build vs buy scenarios for AI infrastructure",
      "Quantify sovereignty and compliance posture",
      "Align DC strategy with ESG and carbon goals",
    ],
  },
  {
    icon: Leaf,
    title: "Sustainability Lead",
    subtitle: "Quantify and reduce energy and carbon footprints",
    bullets: [
      "Track Scope 2 and Scope 3 emissions in real-time",
      "Compare renewable energy mix across regions",
      "Report carbon savings to stakeholders",
    ],
  },
  {
    icon: Server,
    title: "Data Centre Operations",
    subtitle: "Predict failures and cooling issues before they happen",
    bullets: [
      "Monitor PUE, cooling efficiency, and power chains",
      "Simulate failure scenarios and recovery playbooks",
      "Optimize rack placement and thermal zones",
    ],
  },
  {
    icon: Cpu,
    title: "AI Infra Lead / MLOps",
    subtitle: "Right-size GPUs and job routing by scenario",
    bullets: [
      "Model GPU cluster sizing for training workloads",
      "Simulate job scheduling under power constraints",
      "Balance cost, latency, and carbon per inference",
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5 },
  },
};

export function TwinUseCases() {
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
            Built for Every Stakeholder
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            From executive strategy to hands-on operations, the Twin Studio serves your entire organization.
          </p>
        </motion.div>
        
        <motion.div 
          className="grid md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {personas.map((persona, index) => (
            <motion.div key={index} variants={cardVariants}>
              <Card 
                className="bg-slate-800/30 border-slate-700/50 hover:border-primary/50 transition-all duration-300 h-full group cursor-default"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-4">
                    <motion.div 
                      className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors"
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <persona.icon className="h-6 w-6 text-primary" />
                    </motion.div>
                    <div>
                      <h3 className="text-lg font-semibold text-white group-hover:text-primary transition-colors">
                        {persona.title}
                      </h3>
                      <p className="text-sm text-slate-400">
                        {persona.subtitle}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {persona.bullets.map((bullet, bulletIndex) => (
                      <motion.li 
                        key={bulletIndex} 
                        className="flex items-start gap-2 text-sm text-slate-300"
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ 
                          duration: 0.3, 
                          delay: 0.3 + index * 0.1 + bulletIndex * 0.05 
                        }}
                      >
                        <motion.div
                          whileHover={{ scale: 1.2 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        </motion.div>
                        <span>{bullet}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
