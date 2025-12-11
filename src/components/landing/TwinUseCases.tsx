/**
 * TwinUseCases - Persona cards showing use cases
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Leaf, Server, Cpu, Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

interface Persona {
  icon: typeof Building2;
  title: string;
  subtitle: string;
  bullets: string[];
  color: string;
  bgColor: string;
  stat: string;
  statLabel: string;
}

const personas: Persona[] = [
  {
    icon: Building2,
    title: "CIO / CTO",
    subtitle: "Shape sovereign AI and DC strategy",
    bullets: [
      "Model build vs buy scenarios for AI infrastructure",
      "Quantify sovereignty and compliance posture",
      "Align DC strategy with ESG and carbon goals",
    ],
    color: "text-primary",
    bgColor: "bg-primary/10",
    stat: "18-24%",
    statLabel: "ROI improvement",
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
    color: "text-success",
    bgColor: "bg-success/10",
    stat: "70%+",
    statLabel: "Carbon visibility",
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
    color: "text-info",
    bgColor: "bg-info/10",
    stat: "99.9%",
    statLabel: "Uptime target",
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
    color: "text-warning",
    bgColor: "bg-warning/10",
    stat: "30-50%",
    statLabel: "Efficiency gains",
  },
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

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 } as const,
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.5 },
  },
};

function PersonaCard({ persona, index }: { persona: Persona; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div 
      variants={cardVariants}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card 
        className={`relative h-full overflow-hidden bg-card/40 border-border/40 transition-all duration-500 group cursor-default ${
          isHovered ? 'bg-card shadow-xl border-border' : 'hover:bg-card/60'
        }`}
      >
        {/* Colored top border */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${persona.bgColor.replace('/10', '/60')} transition-all duration-300 ${isHovered ? 'h-1.5' : ''}`} />
        
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <motion.div 
                className={`w-14 h-14 rounded-2xl ${persona.bgColor} flex items-center justify-center transition-all duration-300 ${isHovered ? 'scale-110' : ''}`}
                animate={{ rotate: isHovered ? [0, -5, 5, 0] : 0 }}
                transition={{ duration: 0.4 }}
              >
                <persona.icon className={`h-7 w-7 ${persona.color}`} />
              </motion.div>
              <div>
                <h3 className={`text-lg font-semibold transition-colors duration-300 ${isHovered ? persona.color : 'text-foreground'}`}>
                  {persona.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {persona.subtitle}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <ul className="space-y-2.5">
            {persona.bullets.map((bullet, bulletIndex) => (
              <motion.li 
                key={bulletIndex} 
                className="flex items-start gap-2.5 text-sm text-muted-foreground group-hover:text-muted-foreground/90"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ 
                  duration: 0.3, 
                  delay: 0.3 + index * 0.08 + bulletIndex * 0.05 
                }}
              >
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  transition={{ duration: 0.2 }}
                  className="mt-0.5 flex-shrink-0"
                >
                  <Check className={`h-4 w-4 ${persona.color}`} />
                </motion.div>
                <span>{bullet}</span>
              </motion.li>
            ))}
          </ul>

          {/* Stat reveal on hover */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: isHovered ? 1 : 0, 
              height: isHovered ? 'auto' : 0 
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={`p-3 rounded-xl ${persona.bgColor} flex items-center justify-between mt-2`}>
              <div>
                <div className={`text-2xl font-bold ${persona.color}`}>
                  {persona.stat}
                </div>
                <div className="text-xs text-muted-foreground">
                  {persona.statLabel}
                </div>
              </div>
              <ArrowRight className={`h-5 w-5 ${persona.color}`} />
            </div>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TwinUseCases() {
  return (
    <section className="py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-muted/20 via-background to-background">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
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
              For Every Stakeholder
            </span>
          </motion.div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Built for Your Entire Organization
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From executive strategy to hands-on operations, the Twin Studio serves 
            every role in your data centre ecosystem.
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
            <PersonaCard key={index} persona={persona} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
