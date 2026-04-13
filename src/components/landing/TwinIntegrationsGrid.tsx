/**
 * TwinIntegrationsGrid - Integration logos and ecosystem section
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Cloud, Cpu, Server, Gauge, Zap, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const integrationDefs = [
  { nameKey: "landing.intAws", descKey: "landing.intAwsDesc", icon: Cloud, category: "cloud" },
  { nameKey: "landing.intAzure", descKey: "landing.intAzureDesc", icon: Cloud, category: "cloud" },
  { nameKey: "landing.intGcp", descKey: "landing.intGcpDesc", icon: Cloud, category: "cloud" },
  { nameKey: "landing.intNvidia", descKey: "landing.intNvidiaDesc", icon: Cpu, category: "compute" },
  { nameKey: "landing.intNlyte", descKey: "landing.intNlyteDesc", icon: Server, category: "dcim" },
  { nameKey: "landing.intSchneider", descKey: "landing.intSchneiderDesc", icon: Gauge, category: "dcim" },
  { nameKey: "landing.intAura", descKey: "landing.intAuraDesc", icon: Zap, category: "platform" },
  { nameKey: "landing.intCarbon", descKey: "landing.intCarbonDesc", icon: BarChart3, category: "sustainability" },
];

const categoryDefs = [
  { key: "cloud", labelKey: "landing.catCloud", color: "text-info" },
  { key: "compute", labelKey: "landing.catCompute", color: "text-warning" },
  { key: "dcim", labelKey: "landing.catDcim", color: "text-success" },
  { key: "platform", labelKey: "landing.catPlatform", color: "text-primary" },
  { key: "sustainability", labelKey: "landing.catSustainability", color: "text-success" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 25, scale: 0.95 } as const,
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4 } },
};

export function TwinIntegrationsGrid() {
  const { t } = useTranslation();

  return (
    <section className="py-20 lg:py-28 bg-gradient-to-b from-muted/30 via-background to-background overflow-hidden">
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
            <span className="px-4 py-1.5 rounded-full bg-muted text-foreground text-sm font-medium">
              {t('landing.ecosystem')}
            </span>
          </motion.div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('landing.dataSourceIntegrations')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('landing.integrationsDescription')}
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-5"
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
                whileHover={{ scale: 1.04, y: -4, transition: { duration: 0.2 } }}
                className="group flex flex-col items-center p-6 bg-card/50 rounded-2xl border border-border/40 hover:border-primary/40 hover:bg-card/80 hover:shadow-lg transition-all cursor-default"
              >
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-all"
                  whileHover={{ rotate: [0, -8, 8, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <integration.icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                </motion.div>
                <div className="text-center">
                  <div className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    {t(integration.nameKey)}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {t(integration.descKey)}
                  </div>
                  {category && (
                    <span className={`text-[10px] uppercase tracking-wider ${category.color} opacity-70`}>
                      {t(category.labelKey)}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <p className="text-sm text-muted-foreground">
            {t('landing.integrationsNote', { count: 50 })}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
