/**
 * TwinBusinessCase - finance and procurement oriented section.
 *
 * Describes only what the platform actually models from a visitor-supplied
 * facility specification. No return-on-investment claim, no invented savings:
 * every output referenced here is simulated design-time output and is labelled
 * as such, consistent with the platform truth semantics.
 */
import { Coins, Leaf, Landmark, ShieldAlert, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "./SectionHeading";

const items = [
  { icon: Coins, titleKey: "landing.businessCaseItem1Title", bodyKey: "landing.businessCaseItem1Body" },
  { icon: Leaf, titleKey: "landing.businessCaseItem2Title", bodyKey: "landing.businessCaseItem2Body" },
  { icon: Landmark, titleKey: "landing.businessCaseItem3Title", bodyKey: "landing.businessCaseItem3Body" },
  { icon: ShieldAlert, titleKey: "landing.businessCaseItem4Title", bodyKey: "landing.businessCaseItem4Body" },
];

export function TwinBusinessCase() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="overflow-hidden bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          eyebrow={t("landing.businessCaseEyebrow")}
          title={t("landing.businessCaseTitle")}
          lede={t("landing.businessCaseLede")}
        />

        <div className="mt-14 grid gap-10 md:grid-cols-2 lg:gap-x-16">
          {items.map((item, index) => (
            <article key={item.titleKey} className="min-w-0 border-t border-border pt-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <item.icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
              </div>
              <h3 className="mt-5 font-display text-lg font-bold uppercase tracking-tight text-foreground">
                {t(item.titleKey)}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{t(item.bodyKey)}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-6 border-t border-border pt-8 lg:flex-row lg:items-center lg:justify-between">
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            {t("landing.businessCaseNote")}
          </p>
          <Button
            className="group h-12 shrink-0 rounded-none bg-accent px-8 text-xs font-bold uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
            onClick={() => navigate("/blueprint-estimator")}
          >
            {t("landing.businessCaseCta")}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </section>
  );
}
