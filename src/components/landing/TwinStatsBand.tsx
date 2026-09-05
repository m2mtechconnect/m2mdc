/**
 * TwinStatsBand - platform capability targets as a monospaced instrument band.
 * Values and benchmark labels are unchanged design targets, not measured telemetry.
 */

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface StatCard {
  value: string;
  labelKey: string;
  benchmarkKey: string;
  benchmarkValue?: string;
}

const stats: StatCard[] = [
  { value: "<1.3", labelKey: "landing.targetPue", benchmarkKey: "landing.industryAvg", benchmarkValue: "1.58" },
  { value: ">85%", labelKey: "landing.gpuUtilizationTarget", benchmarkKey: "landing.industryAvg", benchmarkValue: "60%" },
  { value: "<50", labelKey: "landing.gco2Target", benchmarkKey: "landing.industryAvg", benchmarkValue: "400+" },
  { value: "99.99%", labelKey: "landing.uptimeTarget", benchmarkKey: "landing.tierIVStandard" },
];

export function TwinStatsBand() {
  const { t } = useTranslation();

  return (
    <section className="bg-[#0A0A0A] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
            {t('landing.platformCapabilities')}
          </span>
          <h2 className="mt-5 font-display text-3xl font-bold uppercase leading-tight tracking-tight text-[#F5F7FA] lg:text-5xl">
            {t('landing.designedToBenchmarks')}
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-[#C9CDD3]">
            {t('landing.statsBandDescription')}
          </p>
        </motion.div>

        <dl className="mt-14 grid grid-cols-1 gap-px bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.labelKey}
              className="bg-[#0A0A0A] px-6 py-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <span className="font-mono text-xs text-[#AEB4BC]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <dd className="mt-4 font-mono text-4xl text-success lg:text-5xl">{stat.value}</dd>
              <dt className="mt-3 text-sm font-medium text-[#F5F7FA]">{t(stat.labelKey)}</dt>
              <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#AEB4BC]">
                {stat.benchmarkValue ? t(stat.benchmarkKey, { value: stat.benchmarkValue }) : t(stat.benchmarkKey)}
              </p>
            </motion.div>
          ))}
        </dl>

        <p className="mt-10 text-sm text-[#AEB4BC]">{t('landing.benchmarkNote')}</p>
      </div>
    </section>
  );
}
