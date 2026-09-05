/**
 * Demo request page - public lead capture for guided demo requests.
 * Submits through the validated, rate-limited public-intake intake (contact kind).
 */
import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { AuraLogo } from '@/components/brand/AuraLogo';
import { useTranslation } from 'react-i18next';

const demoRequestSchema = z.object({
  name: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.string().trim().email('Please enter a valid work email').max(255),
  company_name: z.string().trim().max(200).optional(),
  message: z.string().trim().max(4000).optional(),
  // Honeypot - must stay empty.
  company_website: z.string().max(0).optional(),
});

type DemoRequestFormData = z.infer<typeof demoRequestSchema>;

export default function RequestDemo() {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DemoRequestFormData>({ resolver: zodResolver(demoRequestSchema) });

  const onSubmit = async (data: DemoRequestFormData) => {
    setSubmitting(true);
    const summary = [
      t('demoRequest.intakePrefix'),
      data.company_name ? `${t('demoRequest.companyLabel')}: ${data.company_name}` : null,
      data.message || null,
    ]
      .filter(Boolean)
      .join('\n');

    const { data: result, error } = await supabase.functions.invoke('public-intake', {
      body: {
        kind: 'contact',
        name: data.name,
        email: data.email,
        message: summary,
        company_website: data.company_website ?? '',
      },
    });
    setSubmitting(false);

    if (error || !result?.ok) {
      toast({
        title: t('onboarding.somethingWentWrong'),
        description: t('onboarding.pleaseTryAgain'),
        variant: 'destructive',
      });
      return;
    }
    setSubmitted(true);
  };

  return (
    <>
      <Helmet>
        <title>{t('demoRequest.metaTitle')}</title>
        <meta name="description" content={t('demoRequest.metaDescription')} />
        <link rel="canonical" href="https://auradc.m2mtechconnect.com/request-demo" />
        <meta property="og:title" content={t('demoRequest.metaTitle')} />
        <meta property="og:description" content={t('demoRequest.metaDescription')} />
        <meta property="og:url" content="https://auradc.m2mtechconnect.com/request-demo" />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="aura-marketing flex min-h-screen flex-col bg-[#0A0A0A]">
        <header className="border-b border-white/10">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <a href="/" className="flex items-center gap-2 text-sm text-[#AEB4BC] transition-colors hover:text-[#F5F7FA]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              <AuraLogo surface="dark" />
            </a>
          </div>
        </header>

        <main className="flex flex-1 items-start justify-center px-4 py-12 lg:py-20">
          <div className="w-full max-w-xl">
            {submitted ? (
              <div className="border border-white/10 bg-white/[0.03] p-10 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success" aria-hidden="true" />
                <h1 className="mt-6 font-display text-2xl font-bold uppercase tracking-tight text-[#F5F7FA]">
                  {t('demoRequest.successTitle')}
                </h1>
                <p className="mt-4 text-sm leading-relaxed text-[#C9CDD3]">
                  {t('demoRequest.successBody')}
                </p>
                <Button
                  className="mt-8 h-12 rounded-none bg-accent px-8 text-xs font-semibold uppercase tracking-[0.2em] text-accent-foreground hover:bg-accent/90"
                  onClick={() => { window.location.href = '/'; }}
                >
                  {t('demoRequest.backHome')}
                </Button>
              </div>
            ) : (
              <>
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-success">
                  {t('demoRequest.eyebrow')}
                </span>
                <h1 className="mt-4 font-display text-[clamp(2rem,5vw,3.25rem)] font-bold uppercase leading-[0.95] tracking-tight text-[#F5F7FA]">
                  {t('demoRequest.title')}
                </h1>
                <p className="mt-4 max-w-lg text-base leading-relaxed text-[#C9CDD3]">
                  {t('demoRequest.lede')}
                </p>

                <form onSubmit={handleSubmit(onSubmit)} className="mt-10 space-y-6" noValidate>
                  {/* Honeypot: hidden from humans, bots fill it. */}
                  <input
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    className="hidden"
                    {...register('company_website')}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="demo-name" className="text-xs font-semibold uppercase tracking-[0.16em] text-[#AEB4BC]">
                      {t('demoRequest.nameLabel')}
                    </Label>
                    <Input
                      id="demo-name"
                      autoComplete="name"
                      className="h-12 rounded-none border-white/15 bg-white/[0.03] text-[#F5F7FA] placeholder:text-[#AEB4BC]/60"
                      placeholder={t('demoRequest.namePlaceholder')}
                      {...register('name')}
                    />
                    {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-email" className="text-xs font-semibold uppercase tracking-[0.16em] text-[#AEB4BC]">
                      {t('demoRequest.emailLabel')}
                    </Label>
                    <Input
                      id="demo-email"
                      type="email"
                      autoComplete="email"
                      className="h-12 rounded-none border-white/15 bg-white/[0.03] text-[#F5F7FA] placeholder:text-[#AEB4BC]/60"
                      placeholder={t('demoRequest.emailPlaceholder')}
                      {...register('email')}
                    />
                    {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-company" className="text-xs font-semibold uppercase tracking-[0.16em] text-[#AEB4BC]">
                      {t('demoRequest.companyLabel')}
                    </Label>
                    <Input
                      id="demo-company"
                      autoComplete="organization"
                      className="h-12 rounded-none border-white/15 bg-white/[0.03] text-[#F5F7FA] placeholder:text-[#AEB4BC]/60"
                      placeholder={t('demoRequest.companyPlaceholder')}
                      {...register('company_name')}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="demo-message" className="text-xs font-semibold uppercase tracking-[0.16em] text-[#AEB4BC]">
                      {t('demoRequest.messageLabel')}
                    </Label>
                    <Textarea
                      id="demo-message"
                      rows={4}
                      className="rounded-none border-white/15 bg-white/[0.03] text-[#F5F7FA] placeholder:text-[#AEB4BC]/60"
                      placeholder={t('demoRequest.messagePlaceholder')}
                      {...register('message')}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-14 w-full rounded-none bg-accent px-8 text-sm font-bold uppercase tracking-[0.16em] text-accent-foreground hover:bg-accent/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                        {t('demoRequest.submitting')}
                      </>
                    ) : (
                      t('demoRequest.submit')
                    )}
                  </Button>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
