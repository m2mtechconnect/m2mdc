/**
 * TwinUseCases - persona rail showing who each AURA view serves.
 * Restrained editorial styling: hairline rules, mono indices, single green accent.
 */

import { Building2, Leaf, Server, Cpu, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionHeading } from "./SectionHeading";

interface PersonaDef {
  id: string;
  icon: typeof Building2;
  titleKey: string;
  subtitleKey: string;
  bulletKeys: string[];
  statKey: string;
  statLabelKey: string;
}

const personaDefs: PersonaDef[] = [
  {
    id: "sovereignty",
    icon: Building2,
    titleKey: "landing.cioCto",
    subtitleKey: "landing.cioCtoSubtitle",
    bulletKeys: ["landing.cioCtoB1", "landing.cioCtoB2", "landing.cioCtoB3"],
    statKey: "landing.cioCtoStat",
    statLabelKey: "landing.cioCtoStatLabel",
  },
  {
    id: "sustainability",
    icon: Leaf,
    titleKey: "landing.sustainabilityLead",
    subtitleKey: "landing.sustainabilityLeadSubtitle",
    bulletKeys: ["landing.sustainabilityLeadB1", "landing.sustainabilityLeadB2", "landing.sustainabilityLeadB3"],
    statKey: "landing.sustainabilityLeadStat",
    statLabelKey: "landing.sustainabilityLeadStatLabel",
  },
  {
    id: "operations",
    icon: Server,
    titleKey: "landing.dcOps",
    subtitleKey: "landing.dcOpsSubtitle",
    bulletKeys: ["landing.dcOpsB1", "landing.dcOpsB2", "landing.dcOpsB3"],
    statKey: "landing.dcOpsStat",
    statLabelKey: "landing.dcOpsStatLabel",
  },
  {
    id: "capacity",
    icon: Cpu,
    titleKey: "landing.aiInfraLead",
    subtitleKey: "landing.aiInfraLeadSubtitle",
    bulletKeys: ["landing.aiInfraLeadB1", "landing.aiInfraLeadB2", "landing.aiInfraLeadB3"],
    statKey: "landing.aiInfraLeadStat",
    statLabelKey: "landing.aiInfraLeadStatLabel",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
} as const;

function PersonaCard({ persona, index }: { persona: PersonaDef; index: number }) {
  const { t } = useTranslation();

  return (
    <motion.article
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      className="group grid min-w-0 gap-8 border-t border-border pt-8 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.42fr)] md:gap-12"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-success">{String(index + 1).padStart(2, "0")}</span>
          <persona.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
        </div>
        <h3 className="mt-5 font-display text-xl font-bold uppercase tracking-tight text-foreground md:text-2xl">
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
      </div>
      <div className="flex min-w-0 flex-col justify-between border-t border-border/60 pt-5 md:border-l md:border-t-0 md:pl-8 md:pt-0">
        <div>
          <div className="font-mono text-3xl font-bold text-success">{t(persona.statKey)}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            {t(persona.statLabelKey)}
          </div>
        </div>
        <Button asChild className="group/cta mt-8 w-full rounded-none bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/blueprint-estimator">
            {t("landing.businessCaseCta")}
            <ArrowRight className="transition-transform group-hover/cta:translate-x-1" aria-hidden="true" />
          </Link>
        </Button>
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
        <Tabs defaultValue={personaDefs[0].id} className="mt-12 min-w-0">
          <div className="overflow-x-auto pb-2">
            <TabsList
              aria-label={t("landing.dashboardViewsForEveryRole")}
              className="inline-flex h-auto min-w-full justify-start gap-px rounded-none bg-border p-px"
            >
              {personaDefs.map((persona, index) => (
                <TabsTrigger
                  key={persona.id}
                  value={persona.id}
                  className="min-h-12 flex-1 rounded-none bg-background px-4 py-3 text-left text-xs font-semibold uppercase whitespace-normal data-[state=active]:bg-foreground data-[state=active]:text-background"
                >
                  <span className="mr-2 font-mono text-success">{String(index + 1).padStart(2, "0")}</span>
                  {t(persona.titleKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {personaDefs.map((persona, index) => (
            <TabsContent key={persona.id} value={persona.id} className="mt-6">
              <PersonaCard persona={persona} index={index} />
            </TabsContent>
          ))}
        </Tabs>
        <p className="mt-8 max-w-3xl text-xs leading-relaxed text-muted-foreground">
          {t("landing.businessCaseNote")}
        </p>
      </div>
    </section>
  );
}
