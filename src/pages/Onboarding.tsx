/**
 * Onboarding Questionnaire - Multi-step lead capture form
 * Captures prospect info before routing to sign-up
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import m2mLogo from "@/assets/m2m-logo.png";
import { StepAboutYou } from "@/components/onboarding/StepAboutYou";
import { StepDataCentre } from "@/components/onboarding/StepDataCentre";
import { StepGoals } from "@/components/onboarding/StepGoals";
import { StepSummary } from "@/components/onboarding/StepSummary";

const onboardingSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Please enter a valid work email").max(255),
  job_title: z.string().min(1, "Please select your role"),
  company_name: z.string().trim().min(1, "Company name is required").max(200),
  company_size: z.string().min(1, "Please select company size"),
  num_data_centres: z.string().min(1, "Please select number of data centres"),
  rack_count: z.string().min(1, "Please select rack count"),
  workload_types: z.array(z.string()).min(1, "Select at least one workload type"),
  current_pue: z.string().optional(),
  goals: z.array(z.string()).min(1, "Select at least one goal"),
  challenge: z.string().max(1000).optional(),
  timeline: z.string().min(1, "Please select a timeline"),
});

export type OnboardingFormData = z.infer<typeof onboardingSchema>;

// Fields validated per step
const stepFields: (keyof OnboardingFormData)[][] = [
  ["full_name", "email", "job_title", "company_name", "company_size"],
  ["num_data_centres", "rack_count", "workload_types"],
  ["goals", "timeline"],
  [], // summary step - no validation needed
];

const stepTitles = ["About You", "Your Data Centre", "Your Goals", "Summary"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);

  const form = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      full_name: "",
      email: "",
      job_title: "",
      company_name: "",
      company_size: "",
      num_data_centres: "",
      rack_count: "",
      workload_types: [],
      current_pue: "",
      goals: [],
      challenge: "",
      timeline: "",
    },
    mode: "onTouched",
  });

  const progress = ((step + 1) / stepTitles.length) * 100;

  const goNext = async () => {
    const fields = stepFields[step];
    if (fields.length > 0) {
      const valid = await form.trigger(fields);
      if (!valid) return;
    }
    setDirection(1);
    setStep((s) => Math.min(s + 1, stepTitles.length - 1));
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async () => {
    const valid = await form.trigger();
    if (!valid) return;

    setSubmitting(true);
    const data = form.getValues();

    const { error } = await supabase.from("onboarding_submissions").insert({
      full_name: data.full_name,
      email: data.email,
      job_title: data.job_title,
      company_name: data.company_name,
      company_size: data.company_size,
      num_data_centres: data.num_data_centres,
      rack_count: data.rack_count,
      workload_types: data.workload_types as any,
      current_pue: data.current_pue || null,
      goals: data.goals as any,
      challenge: data.challenge || null,
      timeline: data.timeline,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
      return;
    }

    // Mark onboarding as completed so auth pages become accessible
    localStorage.setItem("onboarding_completed", "true");
    toast({ title: "Welcome aboard!", description: "Let's create your account." });
    navigate("/sign-up");
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <img src={m2mLogo} alt="M2M" className="h-6 w-auto" />
          </a>
          <span className="text-sm text-muted-foreground">
            Step {step + 1} of {stepTitles.length}
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-4 py-8 lg:py-12">
        <div className="w-full max-w-2xl">
          {/* Step indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {stepTitles.map((title, i) => (
                <div key={title} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      i < step
                        ? "bg-success text-success-foreground"
                        : i === step
                        ? "bg-accent text-accent-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-sm hidden sm:inline ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {title}
                  </span>
                  {i < stepTitles.length - 1 && (
                    <div className={`hidden sm:block w-8 lg:w-16 h-px mx-2 ${i < step ? "bg-success" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Form */}
          <FormProvider {...form}>
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl border border-border/50 p-6 lg:p-8 shadow-lg">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {step === 0 && <StepAboutYou />}
                  {step === 1 && <StepDataCentre />}
                  {step === 2 && <StepGoals />}
                  {step === 3 && <StepSummary data={form.getValues()} />}
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/30">
                <Button
                  variant="ghost"
                  onClick={goBack}
                  disabled={step === 0}
                  className="text-muted-foreground"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                {step < stepTitles.length - 1 ? (
                  <Button onClick={goNext} className="bg-accent text-accent-foreground hover:bg-accent/90">
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-accent text-accent-foreground hover:bg-accent/90"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting…
                      </>
                    ) : (
                      "Create Your Account"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </FormProvider>
        </div>
      </main>
    </div>
  );
}
