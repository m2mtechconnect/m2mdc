/**
 * Blueprint estimator lead capture.
 *
 * Submits the visitor's design spec, modelled report and any executed scenario
 * through the server-controlled public intake used by sign-up onboarding, so
 * each estimator session becomes a real lead record. All submitted figures are
 * labelled as simulated design-time output.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  buildBlueprintLeadPayloads,
  type BlueprintLeadContact,
} from '@/lib/blueprint/blueprintLeadPayload';
import type {
  BlueprintEstimatorInput,
  BlueprintEstimatorResult,
} from '@/lib/blueprint/publicBlueprintEstimator';
import type { ScenarioRunResult } from '@/lib/blueprint/publicScenarioRun';

const leadSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.string().trim().email('Enter a valid work email').max(255),
  job_title: z.string().trim().min(1, 'Role is required').max(160),
  company_name: z.string().trim().min(1, 'Company is required').max(200),
  company_size: z.string().min(1),
  timeline: z.string().min(1),
  // Honeypot - must stay empty.
  company_website: z.string().max(0).optional(),
});

type LeadFormData = z.infer<typeof leadSchema>;

const COMPANY_SIZES = ['1-50', '51-200', '201-1,000', '1,000+'];

const fieldClass =
  'h-11 rounded-none border-white/15 bg-[#111112] text-sm text-[#F5F7FA] placeholder:text-[#7C838C] focus-visible:ring-success';
const selectClass =
  'h-11 w-full rounded-none border border-white/15 bg-[#111112] px-3 text-sm text-[#F5F7FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success';
const labelClass = 'text-xs font-semibold uppercase tracking-[0.16em] text-[#AEB4BC]';

interface BlueprintLeadFormProps {
  spec: BlueprintEstimatorInput;
  report: BlueprintEstimatorResult;
  run: ScenarioRunResult | null;
}

export function BlueprintLeadForm({ spec, report, run }: BlueprintLeadFormProps) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const timelineOptions = [
    t('onboarding.timelineOptions.exploring'),
    t('onboarding.timelineOptions.oneToThree'),
    t('onboarding.timelineOptions.threeToSix'),
    t('onboarding.timelineOptions.sixToTwelve'),
  ];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      full_name: '',
      email: '',
      job_title: '',
      company_name: '',
      company_size: COMPANY_SIZES[1],
      timeline: timelineOptions[0],
      company_website: '',
    },
  });

  const onSubmit = async (data: LeadFormData) => {
    setSubmitting(true);
    const payloads = buildBlueprintLeadPayloads(data as BlueprintLeadContact, spec, report, run);

    const lead = await supabase.functions.invoke('public-intake', { body: payloads.onboarding });
    // The report itself is filed as a contact record so every scenario
    // submission is captured, even when the lead record is deduplicated.
    const detail = await supabase.functions.invoke('public-intake', { body: payloads.contact });
    setSubmitting(false);

    const leadOk = !lead.error && lead.data?.ok === true;
    const detailOk = !detail.error && detail.data?.ok === true;

    if (!leadOk && !detailOk) {
      toast({
        title: t('onboarding.somethingWentWrong'),
        description: t('onboarding.pleaseTryAgain'),
        variant: 'destructive',
      });
      return;
    }
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="mt-10 border border-white/10 bg-[#111112] p-8">
        <CheckCircle2 className="h-8 w-8 text-success" aria-hidden="true" />
        <h3 className="mt-4 font-display text-xl font-bold uppercase tracking-tight text-[#F5F7FA]">
          {t('blueprintTool.lead.successTitle')}
        </h3>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#C9CDD3]">
          {t('blueprintTool.lead.successBody')}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-10 border border-white/10 bg-[#111112] p-6 lg:p-8">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-success">
        {t('blueprintTool.lead.eyebrow')}
      </h3>
      <p className="mt-4 font-display text-2xl font-bold uppercase leading-tight tracking-tight text-[#F5F7FA]">
        {t('blueprintTool.lead.title')}
      </p>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#C9CDD3]">
        {run
          ? t('blueprintTool.lead.introWithRun', { scenario: run.scenarioName })
          : t('blueprintTool.lead.intro')}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 grid gap-5 sm:grid-cols-2" noValidate>
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          {...register('company_website')}
        />

        <div className="space-y-2">
          <Label htmlFor="bp-lead-name" className={labelClass}>
            {t('blueprintTool.lead.nameLabel')}
          </Label>
          <Input id="bp-lead-name" autoComplete="name" className={fieldClass} {...register('full_name')} />
          {errors.full_name ? <p className="text-xs text-destructive">{errors.full_name.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bp-lead-email" className={labelClass}>
            {t('blueprintTool.lead.emailLabel')}
          </Label>
          <Input
            id="bp-lead-email"
            type="email"
            autoComplete="email"
            className={fieldClass}
            {...register('email')}
          />
          {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bp-lead-role" className={labelClass}>
            {t('blueprintTool.lead.roleLabel')}
          </Label>
          <Input
            id="bp-lead-role"
            autoComplete="organization-title"
            className={fieldClass}
            {...register('job_title')}
          />
          {errors.job_title ? <p className="text-xs text-destructive">{errors.job_title.message}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bp-lead-company" className={labelClass}>
            {t('blueprintTool.lead.companyLabel')}
          </Label>
          <Input
            id="bp-lead-company"
            autoComplete="organization"
            className={fieldClass}
            {...register('company_name')}
          />
          {errors.company_name ? (
            <p className="text-xs text-destructive">{errors.company_name.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bp-lead-size" className={labelClass}>
            {t('blueprintTool.lead.sizeLabel')}
          </Label>
          <select id="bp-lead-size" className={selectClass} {...register('company_size')}>
            {COMPANY_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bp-lead-timeline" className={labelClass}>
            {t('blueprintTool.lead.timelineLabel')}
          </Label>
          <select id="bp-lead-timeline" className={selectClass} {...register('timeline')}>
            {timelineOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={submitting}
            className="h-14 w-full rounded-none bg-accent px-8 text-sm font-bold uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90 sm:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {t('blueprintTool.lead.submitting')}
              </>
            ) : (
              t('blueprintTool.lead.submit')
            )}
          </Button>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.18em] text-[#AEB4BC]">
            {t('blueprintTool.lead.provenance')}
          </p>
        </div>
      </form>
    </div>
  );
}
