import type { OnboardingFormData } from "@/pages/Onboarding";
import { CheckCircle2 } from "lucide-react";

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
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-success/10">
          <CheckCircle2 className="h-5 w-5 text-success" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Review & Submit</h2>
          <p className="text-sm text-muted-foreground">Confirm your details before creating your account.</p>
        </div>
      </div>

      <div className="bg-muted/30 rounded-xl p-5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-3">About You</h3>
        <SummaryRow label="Name" value={data.full_name} />
        <SummaryRow label="Email" value={data.email} />
        <SummaryRow label="Role" value={data.job_title} />
        <SummaryRow label="Company" value={data.company_name} />
        <SummaryRow label="Company Size" value={data.company_size} />
      </div>

      <div className="bg-muted/30 rounded-xl p-5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-3">Data Centre</h3>
        <SummaryRow label="Data Centres" value={data.num_data_centres} />
        <SummaryRow label="Rack Count" value={data.rack_count} />
        <SummaryRow label="Workloads" value={data.workload_types.join(", ")} />
        {data.current_pue && (
          <SummaryRow label="Current PUE" value={(parseInt(data.current_pue) / 100).toFixed(2)} />
        )}
      </div>

      <div className="bg-muted/30 rounded-xl p-5 space-y-1">
        <h3 className="text-sm font-semibold text-foreground mb-3">Goals</h3>
        <SummaryRow label="Goals" value={data.goals.join(", ")} />
        {data.challenge && <SummaryRow label="Challenge" value={data.challenge} />}
        <SummaryRow label="Timeline" value={data.timeline} />
      </div>
    </div>
  );
}
