/**
 * TwinDifferentiators - Key dashboard capabilities.
 * NVIDIA-style technical layout: light enterprise canvas, hairline rules,
 * monospaced indices, square edges and green technical accent. Marketing only.
 */

import { Shield, Box, Leaf, Cpu, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface Differentiator {
  icon: typeof Shield;
  titleKey: string;
  descKey: string;
  metric: string;
  metricLabelKey: string;
}

const differentiatorDefs: Differentiator[] = [
  {
    icon: Shield,
    titleKey: "landing.sovereigntyScoreDashboard",
    descKey: "landing.sovereigntyScoreDashboardDesc",
    metric: "100%",
    metricLabelKey: "landing.sovereigntyVisibility",
  },
  {
    icon: Box,
    titleKey: "landing.rackVisualization3dTitle",
    descKey: "landing.rackVisualization3dDesc",
    metric: "8",
    metricLabelKey: "landing.domainOverlays",
  },
  {
    icon: Leaf,
    titleKey: "landing.carbonIntensityTracking",
    descKey: "landing.carbonIntensityTrackingDesc",
    metric: "<50",
    metricLabelKey: "landing.gco2Target2",
  },
  {
    icon: Cpu,
    titleKey: "landing.subsystemAgentsPanel",
    descKey: "landing.subsystemAgentsPanelDesc",
    metric: "9",
    metricLabelKey: "landing.subsystemAgents",
  },
];

const capabilityKeys = [
  "landing.pueTrendIndicator",
  "landing.gpuUtilMetrics",
  "landing.runScenarioButton",
  "landing.thermalOverlayToggle",
  "landing.sovereigntyScoreDisplay",
  "landing.blueprintDesigner",
  "landing.kpiDeltaComparison",
  "landing.timelinePlaybackControls",
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 } as const,
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export function TwinDifferentiators() {
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
          <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.28em] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            {t('landing.theM2MDifference')}
          </span>
          <h2 className="mt-6 font-display text-3xl font-bold uppercase leading-[1.05] tracking-tight text-foreground lg:text-5xl">
            {t('landing.keyDashboardFeatures')}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-muted-foreground lg:text-lg">
            {t('landing.differentiatorDescription')}
          </p>
        </motion.div>

        <motion.div
          className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
        >
          {differentiatorDefs.map((diff, index) => (
            <motion.div
              key={diff.titleKey}
              variants={itemVariants}
              className="group cursor-default border-t border-border pt-6 transition-colors hover:border-success"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-success">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <diff.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-success" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{t(diff.titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(diff.descKey)}</p>
              <div className="mt-6 flex items-baseline gap-3 border-t border-border/60 pt-4">
                <span className="font-mono text-2xl font-bold text-foreground">{diff.metric}</span>
                <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {t(diff.metricLabelKey)}
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-20 border-t border-border pt-10"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            {t('landing.uiControlsAvailable')}
          </h3>
          <motion.ul
            className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {capabilityKeys.map((key) => (
              <motion.li
                key={key}
                variants={itemVariants}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                <span>{t(key)}</span>
              </motion.li>
            ))}
          </motion.ul>
        </motion.div>
      </div>
    </section>
  );
}
