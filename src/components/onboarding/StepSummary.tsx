import type { OnboardingFormData } from "@/pages/Onboarding";
import { CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface StepSummaryProps {
  data: OnboardingFormData;
}

const SummaryRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between py-2 border-b border-border/30 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground text-right max-w-[60%]">{value}</span>
  </div>
);

export function StepSummary({ data }: StepSummaryProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">{t('onboarding.reviewSubmit')}</h2>
          <p className="text-sm text-muted-foreground">{t('onboarding.confirmDetails')}</p>
        </div>
      </div>

      <div className="bg-muted/30 rounded-xl p-5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('onboarding.aboutYouSection')}</h3>
        <SummaryRow label={t('onboarding.name')} value={data.full_name} />
        <SummaryRow label={t('onboarding.email')} value={data.email} />
        <SummaryRow label={t('onboarding.role')} value={data.job_title} />
        <SummaryRow label={t('onboarding.company')} value={data.company_name} />
        <SummaryRow label={t('onboarding.companySize')} value={data.company_size} />
      </div>

      <div className="bg-muted/30 rounded-xl p-5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('onboarding.dataCentreSection')}</h3>
        <SummaryRow label={t('onboarding.dataCentres')} value={data.num_data_centres} />
        <SummaryRow label={t('onboarding.rackCount')} value={data.rack_count} />
        <SummaryRow label={t('onboarding.workloads')} value={data.workload_types.join(", ")} />
        {data.current_pue && (
          <SummaryRow label={t('onboarding.currentPue')} value={(parseInt(data.current_pue) / 100).toFixed(2)} />
        )}
      </div>

      <div className="bg-muted/30 rounded-xl p-5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-3">{t('onboarding.goalsSection')}</h3>
        <SummaryRow label={t('onboarding.goals')} value={data.goals.join(", ")} />
        {data.challenge && <SummaryRow label={t('onboarding.challenge')} value={data.challenge} />}
        <SummaryRow label={t('onboarding.timeline')} value={data.timeline} />
      </div>
    </div>
  );
}
