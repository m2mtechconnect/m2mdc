/**
 * TwinUseCases - persona rail showing who each AURA view serves.
 * Restrained editorial styling: hairline rules, mono indices, single green accent.
 */

import { Building2, Leaf, Server, Cpu, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SectionHeading } from "./SectionHeading";

interface PersonaDef {
  icon: typeof Building2;
  titleKey: string;
  subtitleKey: string;
  bulletKeys: string[];
  statKey: string;
  statLabelKey: string;
}

const personaDefs: PersonaDef[] = [
  {
    icon: Building2,
    titleKey: "landing.cioCto",
    subtitleKey: "landing.cioCtoSubtitle",
    bulletKeys: ["landing.cioCtoB1", "landing.cioCtoB2", "landing.cioCtoB3"],
    statKey: "landing.cioCtoStat",
    statLabelKey: "landing.cioCtoStatLabel",
  },
  {
    icon: Leaf,
    titleKey: "landing.sustainabilityLead",
    subtitleKey: "landing.sustainabilityLeadSubtitle",
    bulletKeys: ["landing.sustainabilityLeadB1", "landing.sustainabilityLeadB2", "landing.sustainabilityLeadB3"],
    statKey: "landing.sustainabilityLeadStat",
    statLabelKey: "landing.sustainabilityLeadStatLabel",
  },
  {
    icon: Server,
    titleKey: "landing.dcOps",
    subtitleKey: "landing.dcOpsSubtitle",
    bulletKeys: ["landing.dcOpsB1", "landing.dcOpsB2", "landing.dcOpsB3"],
    statKey: "landing.dcOpsStat",
    statLabelKey: "landing.dcOpsStatLabel",
  },
  {
    icon: Cpu,
    titleKey: "landing.aiInfraLead",
    subtitleKey: "landing.aiInfraLeadSubtitle",
    bulletKeys: ["landing.aiInfraLeadB1", "landing.aiInfraLeadB2", "landing.aiInfraLeadB3"],
    statKey: "landing.aiInfraLeadStat",
    statLabelKey: "landing.aiInfraLeadStatLabel",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 } as const,
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

function PersonaCard({ persona, index }: { persona: PersonaDef; index: number }) {
  const { t } = useTranslation();

  return (
    <motion.article
      variants={cardVariants}
      className="group h-full cursor-default border-t border-border pt-6 transition-colors duration-300 hover:border-success"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-success">
          {String(index + 1).padStart(2, "0")}
        </span>
        <persona.icon
          className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-success"
          aria-hidden="true"
        />
      </div>

      <h3 className="mt-6 font-display text-xl font-bold uppercase tracking-tight text-foreground">
        {t(persona.titleKey)}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{t(persona.subtitleKey)}</p>

      <ul className="mt-6 space-y-3">
        {persona.bulletKeys.map((key) => (
          <li key={key} className="flex items-start gap-3 text-sm text-muted-foreground">
            <span aria-hidden="true" className="mt-2 h-px w-4 flex-shrink-0 bg-success" />
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex items-end justify-between border-t border-border/60 pt-4">
        <div>
          <div className="font-mono text-3xl font-bold text-success">{t(persona.statKey)}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {t(persona.statLabelKey)}
          </div>
        </div>
        <ArrowRight
          className="h-5 w-5 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-success"
          aria-hidden="true"
        />
      </div>
    </motion.article>
  );
}

export function TwinUseCases() {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow={t("landing.forEveryStakeholder")}
          title={t("landing.dashboardViewsForEveryRole")}
          lede={t("landing.useCasesDescription")}
        />
        <motion.div
          className="mt-16 grid gap-10 md:grid-cols-2 lg:gap-x-16"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {personaDefs.map((persona, index) => (
            <PersonaCard key={persona.titleKey} persona={persona} index={index} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
