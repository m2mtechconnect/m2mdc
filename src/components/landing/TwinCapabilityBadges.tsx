/**
 * TwinCapabilityBadges - numbered capability rail on a graphite technical surface.
 * Presentation only. Copy comes from the existing i18n keys.
 */

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
} as const;


const capabilityKeys = [
  "landing.sovereigntyScoreTracking",
  "landing.carbonIntensityMonitoring",
  "landing.rackVisualization3d",
  "landing.complianceDashboard",
  "landing.gpuUtilizationMetrics",
  "landing.pueTrendAnalysis",
];

export function TwinCapabilityBadges() {
  const { t } = useTranslation();

  return (
    <section className="border-y border-white/5 bg-[#0A0A0A] py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <span className="text-xs font-semibold uppercase tracking-[0.28em] text-[#AEB4BC]/70">
          {t('landing.platformCapabilities')}
        </span>
        <motion.ul
          className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-40px" }}
        >
          {capabilityKeys.map((key, index) => (
            <motion.li key={key} variants={itemVariants} className="group border-t border-white/10 pt-5">
              <span className="font-mono text-xs text-success">
                {String(index + 1).padStart(2, '0')}
              </span>
              <p className="mt-3 text-base font-medium text-[#F5F7FA] transition-colors group-hover:text-success">
                {t(key)}
              </p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
