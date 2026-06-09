/**
 * TwinUseCases - Persona cards showing use cases
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Leaf, Server, Cpu, Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface PersonaDef {
  icon: typeof Building2;
  titleKey: string;
  subtitleKey: string;
  bulletKeys: string[];
  color: string;
  bgColor: string;
  statKey: string;
  statLabelKey: string;
}

const personaDefs: PersonaDef[] = [
  {
    icon: Building2,
    titleKey: "landing.cioCto",
    subtitleKey: "landing.cioCtoSubtitle",
    bulletKeys: ["landing.cioCtoB1", "landing.cioCtoB2", "landing.cioCtoB3"],
    color: "text-primary",
    bgColor: "bg-primary/10",
    statKey: "landing.cioCtoStat",
    statLabelKey: "landing.cioCtoStatLabel",
  },
  {
    icon: Leaf,
    titleKey: "landing.sustainabilityLead",
    subtitleKey: "landing.sustainabilityLeadSubtitle",
    bulletKeys: ["landing.sustainabilityLeadB1", "landing.sustainabilityLeadB2", "landing.sustainabilityLeadB3"],
    color: "text-success",
    bgColor: "bg-success/10",
    statKey: "landing.sustainabilityLeadStat",
    statLabelKey: "landing.sustainabilityLeadStatLabel",
  },
  {
    icon: Server,
    titleKey: "landing.dcOps",
    subtitleKey: "landing.dcOpsSubtitle",
    bulletKeys: ["landing.dcOpsB1", "landing.dcOpsB2", "landing.dcOpsB3"],
    color: "text-info",
    bgColor: "bg-info/10",
    statKey: "landing.dcOpsStat",
    statLabelKey: "landing.dcOpsStatLabel",
  },
  {
    icon: Cpu,
    titleKey: "landing.aiInfraLead",
    subtitleKey: "landing.aiInfraLeadSubtitle",
    bulletKeys: ["landing.aiInfraLeadB1", "landing.aiInfraLeadB2", "landing.aiInfraLeadB3"],
    color: "text-warning",
    bgColor: "bg-warning/10",
    statKey: "landing.aiInfraLeadStat",
    statLabelKey: "landing.aiInfraLeadStatLabel",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 } as const,
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } },
};

function PersonaCard({ persona, index }: { persona: PersonaDef; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const { t } = useTranslation();

  return (
    <motion.div variants={cardVariants} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <Card className={`relative h-full overflow-hidden bg-card/40 border-border/40 transition-all duration-500 group cursor-default ${isHovered ? 'bg-card shadow-xl border-border' : 'hover:bg-card/60'}`}>
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
                  {t(persona.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground">{t(persona.subtitleKey)}</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2.5">
            {persona.bulletKeys.map((key, bulletIndex) => (
              <motion.li
                key={bulletIndex}
                className="flex items-start gap-2.5 text-sm text-muted-foreground group-hover:text-muted-foreground/90"
                initial={{ opacity: 0, x: -10 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.08 + bulletIndex * 0.05 }}
              >
                <motion.div whileHover={{ scale: 1.2 }} transition={{ duration: 0.2 }} className="mt-0.5 flex-shrink-0">
                  <Check className={`h-4 w-4 ${persona.color}`} />
                </motion.div>
                <span>{t(key)}</span>
              </motion.li>
            ))}
          </ul>
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: isHovered ? 1 : 0, height: isHovered ? 'auto' : 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className={`p-3 rounded-xl ${persona.bgColor} flex items-center justify-between mt-2`}>
              <div>
                <div className={`text-2xl font-bold ${persona.color}`}>{t(persona.statKey)}</div>
                <div className="text-xs text-muted-foreground">{t(persona.statLabelKey)}</div>
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
  const { t } = useTranslation();

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
              {t('landing.forEveryStakeholder')}
            </span>
          </motion.div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('landing.dashboardViewsForEveryRole')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landing.useCasesDescription')}
          </p>
        </motion.div>
        <motion.div
          className="grid md:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {personaDefs.map((persona, index) => (
            <PersonaCard key={index} persona={persona} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
