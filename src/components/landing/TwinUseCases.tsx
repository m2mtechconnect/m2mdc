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
      <Card
        className={`h-full cursor-default rounded-none border-x-0 border-b-0 border-t border-border bg-transparent shadow-none transition-colors duration-300 ${isHovered ? 'bg-muted/40' : ''}`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <span className={`font-mono text-xs ${persona.color}`}>{String(index + 1).padStart(2, '0')}</span>
            <persona.icon className={`h-5 w-5 ${persona.color}`} aria-hidden="true" />
          </div>
          <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-tight text-foreground">
            {t(persona.titleKey)}
          </h3>
          <p className="text-sm text-muted-foreground">{t(persona.subtitleKey)}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            {persona.bulletKeys.map((key, bulletIndex) => (
              <li key={bulletIndex} className="flex items-start gap-3 text-sm text-muted-foreground">
                <Check className={`mt-0.5 h-4 w-4 flex-shrink-0 ${persona.color}`} aria-hidden="true" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-end justify-between border-t border-border/60 pt-4">
            <div>
              <div className={`font-mono text-3xl font-bold ${persona.color}`}>{t(persona.statKey)}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                {t(persona.statLabelKey)}
              </div>
            </div>
            <ArrowRight
              className={`h-5 w-5 transition-transform duration-300 ${persona.color} ${isHovered ? 'translate-x-1' : ''}`}
              aria-hidden="true"
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function TwinUseCases() {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          className="max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {t('landing.forEveryStakeholder')}
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold uppercase leading-[1.05] tracking-tight text-foreground lg:text-5xl">
            {t('landing.dashboardViewsForEveryRole')}
          </h2>
          <p className="mt-5 text-base text-muted-foreground lg:text-lg">
            {t('landing.useCasesDescription')}
          </p>
        </motion.div>
        <motion.div
          className="mt-16 grid gap-10 md:grid-cols-2 lg:gap-x-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {personaDefs.map((persona, index) => (
            <PersonaCard key={index} persona={persona} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

