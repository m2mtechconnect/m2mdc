/**
 * TwinIntegrationsGrid - Integration and platform stack section.
 * NVIDIA-style technical surface: graphite panel, hairline rules, square
 * corners, monospaced indices and green technical accent. Marketing only.
 */

import { Cloud, Cpu, Server, Gauge, Boxes, Sparkles, Cable, FileSearch } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { evidenceQualifier, stackCapability } from "@/config/auraStackManifest";

/**
 * Named third-party systems are only listed where they are genuine, selectable
 * connection or deployment destinations. Platform capability wording never
 * lives here: it comes from the stack manifest below, so the landing page and
 * the product share one stack vocabulary.
 */
const integrationDefs = [
  { nameKey: "landing.intAws", descKey: "landing.intAwsDesc", icon: Cloud, category: "cloud" },
  { nameKey: "landing.intAzure", descKey: "landing.intAzureDesc", icon: Cloud, category: "cloud" },
  { nameKey: "landing.intGcp", descKey: "landing.intGcpDesc", icon: Cloud, category: "cloud" },
  { nameKey: "landing.intNvidia", descKey: "landing.intNvidiaDesc", icon: Cpu, category: "compute" },
  { nameKey: "landing.intNlyte", descKey: "landing.intNlyteDesc", icon: Server, category: "dcim" },
  { nameKey: "landing.intSchneider", descKey: "landing.intSchneiderDesc", icon: Gauge, category: "dcim" },
];

/** Platform stack cards, driven entirely by the canonical stack manifest. */
const STACK_CARD_IDS: { id: string; icon: LucideIcon }[] = [
  { id: 'twin.openusd', icon: Boxes },
  { id: 'ai.managed', icon: Sparkles },
  { id: 'connections.enterprise', icon: Cable },
  { id: 'evidence.workspace', icon: FileSearch },
];

const categoryDefs = [
  { key: "cloud", labelKey: "landing.catCloud" },
  { key: "compute", labelKey: "landing.catCompute" },
  { key: "dcim", labelKey: "landing.catDcim" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 } as const,
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function TwinIntegrationsGrid() {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden bg-[#1E1E1E] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          className="max-w-3xl"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            {t('landing.ecosystem')}
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold uppercase leading-[1.05] tracking-tight text-[#F5F7FA] lg:text-5xl">
            {t('landing.dataSourceIntegrations')}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-[#C9CDD3] lg:text-lg">
            {t('landing.integrationsDescription')}
          </p>
        </motion.div>

        <motion.div
          className="mt-14 grid grid-cols-1 gap-px border border-[#3A3A3A] bg-[#3A3A3A] sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {integrationDefs.map((integration, index) => {
            const category = categoryDefs.find(c => c.key === integration.category);
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                className="group cursor-default bg-[#1E1E1E] p-7 transition-colors hover:bg-[#242424]"
              >
                <div className="flex items-start justify-between">
                  <integration.icon
                    className="h-6 w-6 text-[#AEB4BC] transition-colors group-hover:text-success"
                    aria-hidden="true"
                  />
                  {category && (
                    <span className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-[#AEB4BC]">
                      {t(category.labelKey)}
                    </span>
                  )}
                </div>
                <div className="mt-6 text-base font-semibold text-[#F5F7FA]">
                  {t(integration.nameKey)}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#C9CDD3]">
                  {t(integration.descKey)}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="mt-14 grid grid-cols-1 gap-x-14 gap-y-10 sm:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {STACK_CARD_IDS.map(({ id, icon: Icon }, index) => {
            const capability = stackCapability(id);
            if (!capability || !capability.customerVisible) return null;
            const qualifier = evidenceQualifier(capability.evidenceStatus);
            return (
              <motion.div
                key={id}
                variants={itemVariants}
                className="border-t border-[#3A3A3A] pt-6 text-left"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-success">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon className="h-5 w-5 text-[#AEB4BC]" aria-hidden="true" />
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span className="text-lg font-semibold text-[#F5F7FA]">{capability.label}</span>
                  {qualifier && (
                    <span className="border border-[#3A3A3A] px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[#AEB4BC]">
                      {qualifier}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-[#C9CDD3]">
                  {capability.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.p
          className="mt-14 border-t border-[#3A3A3A] pt-8 text-sm text-[#AEB4BC]"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {t('landing.integrationsNote', { count: 50 })}
        </motion.p>
      </div>
    </section>
  );
}
