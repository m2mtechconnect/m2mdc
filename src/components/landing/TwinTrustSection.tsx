/**
 * TwinTrustSection - Trust & sovereignty section
 * M2M Tech brand styling with Space Grotesk display font
 * Uses M2M brand design tokens from index.css
 */

import { Badge } from "@/components/ui/badge";
import { Shield, Globe, Lock, Server } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

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
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
  {
    icon: Shield,
    titleKey: "landing.sovereigntyScore",
    descKey: "landing.sovereigntyScoreDesc",
    color: "text-success",
    bgColor: "bg-success/10",
  },
  {
    icon: Lock,
    titleKey: "landing.complianceIndicators",
    descKey: "landing.complianceIndicatorsDesc",
    color: "text-warning",
    bgColor: "bg-warning/10",
  },
  {
    icon: Server,
    titleKey: "landing.canadianCloudRegions",
    descKey: "landing.canadianCloudRegionsDesc",
    color: "text-info",
    bgColor: "bg-info/10",
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
    <section className="py-20 lg:py-28 overflow-hidden bg-gradient-to-b from-background via-muted/10 to-background">
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
            <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              {t('landing.enterpriseTrust')}
            </span>
          </motion.div>
          <h2 className="font-display text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t('landing.sovereigntyComplianceFeatures')}
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            {t('landing.trustDescription')}
          </p>

          <motion.div
            className="flex flex-wrap justify-center gap-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {regionKeys.map((region, index) => (
              <motion.div key={index} variants={itemVariants} whileHover={{ scale: 1.05, y: -2 }} transition={{ duration: 0.2 }}>
                <Badge
                  variant="outline"
                  className="px-4 py-2.5 text-sm border-border bg-card/60 text-foreground cursor-default hover:border-primary/40 hover:bg-card transition-all"
                >
                  <span className="mr-2">{region.flag}</span>
                  {t(region.labelKey)}
                </Badge>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-5 mb-14"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {trustPointDefs.map((point, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
              className="relative flex gap-4 p-6 bg-card/40 rounded-2xl border border-border/40 hover:border-border hover:bg-card/60 transition-all cursor-default group overflow-hidden"
            >
              <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity ${point.bgColor.replace('/10', '/5')}`} />
              <div className="relative flex-shrink-0">
                <motion.div
                  className={`w-12 h-12 rounded-xl ${point.bgColor} flex items-center justify-center group-hover:scale-110 transition-transform`}
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.3 }}
                >
                  <point.icon className={`h-6 w-6 ${point.color}`} />
                </motion.div>
              </div>
              <div className="relative">
                <h3 className={`font-semibold text-lg mb-1.5 group-hover:${point.color} transition-colors text-foreground`}>
                  {t(point.titleKey)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(point.descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
