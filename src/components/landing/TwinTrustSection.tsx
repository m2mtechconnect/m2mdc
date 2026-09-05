/**
 * TwinTrustSection - Trust & sovereignty section
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Badge } from "@/components/ui/badge";
import { Shield, Globe, Lock, Server } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { SectionHeading } from "./SectionHeading";

const regionKeys = [
  { labelKey: "landing.regionCanada", flag: "🇨🇦" },
  { labelKey: "landing.regionEu", flag: "🇪🇺" },
  { labelKey: "landing.regionGov", flag: "🏛️" },
  { labelKey: "landing.regionFinance", flag: "🏦" },
  { labelKey: "landing.regionHealth", flag: "🏥" },
];

const trustPointDefs = [
  {
    icon: Globe,
    titleKey: "landing.dataResidencyMapping",
    descKey: "landing.dataResidencyMappingDesc",
  },
  {
    icon: Shield,
    titleKey: "landing.sovereigntyScore",
    descKey: "landing.sovereigntyScoreDesc",
  },
  {
    icon: Lock,
    titleKey: "landing.complianceIndicators",
    descKey: "landing.complianceIndicatorsDesc",
  },
  {
    icon: Server,
    titleKey: "landing.canadianCloudRegions",
    descKey: "landing.canadianCloudRegionsDesc",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 } as const,
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4 } },
};

export function TwinTrustSection() {
  const { t } = useTranslation();

  return (
    <section className="overflow-hidden bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow={t('landing.enterpriseTrust')}
          title={t('landing.sovereigntyComplianceFeatures')}
          lede={t('landing.trustDescription')}
        />

        <motion.div
          className="mt-10 flex flex-wrap gap-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {regionKeys.map((region, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Badge
                variant="outline"
                className="cursor-default rounded-none border-border bg-transparent px-4 py-2 text-xs uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-success hover:text-foreground"
              >
                <span className="mr-2" aria-hidden="true">{region.flag}</span>
                {t(region.labelKey)}
              </Badge>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-16 grid gap-x-16 gap-y-10 md:grid-cols-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          {trustPointDefs.map((point, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className="group cursor-default border-t border-border pt-6 transition-colors hover:border-success"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground transition-colors group-hover:text-success">{String(index + 1).padStart(2, '0')}</span>
                <point.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-success" aria-hidden="true" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-foreground">{t(point.titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t(point.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

