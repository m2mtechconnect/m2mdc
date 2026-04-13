import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, AlertTriangle, FileText, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { triggerTwinEvent } from "@/lib/digitalTwin/api";
import type { TwinRunResult } from "@/lib/digitalTwin/api";
import { useNavigate } from "react-router-dom";
import { DCCard, DCSectionHeader } from "@/components/dc-ui";

interface IntakeFormData {
  company_name: string;
  website: string;
  sector: string;
  size: string;
  country: string;
  description: string;
}

export default function FundingIntakeDemo() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<TwinRunResult | null>(null);
  
  const { register, handleSubmit, formState: { errors }, setValue, watch } = useForm<IntakeFormData>({
    defaultValues: {
      country: "Canada",
      sector: "SaaS",
      size: "small",
    },
  });

  const watchedSector = watch("sector");
  const watchedSize = watch("size");

  async function onSubmit(data: IntakeFormData) {
    try {
      setSubmitting(true);
      setResult(null);

      const runResult = await triggerTwinEvent({
        twinSlug: "funding-intake-triage",
        eventId: "intake_submitted",
        payload: data,
      });

      setResult(runResult);
      toast.success(t('fundingIntake.intakeSuccess'));
    } catch (error) {
      console.error("Error submitting intake:", error);
      toast.error(t('fundingIntake.intakeFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusVariant(status: string): "operational" | "warning" | "critical" | "neutral" {
    switch (status) {
      case "completed":
        return "operational";
      case "pending_human":
        return "warning";
      case "failed":
        return "critical";
      default:
        return "neutral";
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "high":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
      case "medium":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
      case "low":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      default:
        return "bg-gray-500/10 text-gray-700 dark:text-gray-400";
    }
  }

  function extractTriageData(result: TwinRunResult) {
    // Extract triage data from logs or state changes
    const aiClassifyLog = result.logs.find(log => log.nodeId === "ai_classify");
    const stateUpdateLog = result.stateChanges.find(change => change.nodeId === "state_update");
    
    return {
      programFit: stateUpdateLog?.stateAfter?.program_fit || [],
      readinessScore: stateUpdateLog?.stateAfter?.readiness_score || 0,
      priority: stateUpdateLog?.stateAfter?.priority || "low",
      rationale: stateUpdateLog?.stateAfter?.rationale || "No rationale provided",
      status: stateUpdateLog?.stateAfter?.status || "intake",
    };
  }

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-5xl">
      {/* Header */}
      <DCSectionHeader
        title={t('fundingIntake.title')
        subtitle={t('fundingIntake.subtitle')
        icon={<FileText className="h-6 w-6 text-info" />}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <DCCard
          title={t('fundingIntake.companyIntakeForm')
          subtitle={t('fundingIntake.formSubtitle')
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="company_name">{t('fundingIntake.companyName')} *</Label>
              <Input
                id="company_name"
                {...register("company_name", { required: "Company name is required" })}
                placeholder="Acme Corp"
              />
              {errors.company_name && (
                <p className="text-sm text-red-500">{errors.company_name.message}</p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">{t('fundingIntake.websiteUrl')} *</Label>
              <Input
                id="website"
                type="url"
                {...register("website", { 
                  required: "Website is required",
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: "Please enter a valid URL"
                  }
                })}
                placeholder="https://example.com"
              />
              {errors.website && (
                <p className="text-sm text-red-500">{errors.website.message}</p>
              )}
            </div>

            {/* Sector */}
            <div className="space-y-2">
              <Label htmlFor="sector">{t('fundingIntake.sector')} *</Label>
              <Select value={watchedSector} onValueChange={(value) => setValue("sector", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                  <SelectItem value="Energy">Energy</SelectItem>
                  <SelectItem value="Agri-food">Agri-food</SelectItem>
                  <SelectItem value="SaaS">SaaS</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Company Size */}
            <div className="space-y-2">
              <Label htmlFor="size">{t('fundingIntake.companySize')} *</Label>
              <Select value={watchedSize} onValueChange={(value) => setValue("size", value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Micro (1-9 employees)</SelectItem>
                  <SelectItem value="small">Small (10-49 employees)</SelectItem>
                  <SelectItem value="medium">Medium (50-249 employees)</SelectItem>
                  <SelectItem value="large">Large (250+ employees)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Country */}
            <div className="space-y-2">
              <Label htmlFor="country">{t('fundingIntake.country')} *</Label>
              <Input
                id="country"
                {...register("country", { required: "Country is required" })}
                placeholder="Canada"
              />
              {errors.country && (
                <p className="text-sm text-red-500">{errors.country.message}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t('fundingIntake.description')} *</Label>
              <Textarea
                id="description"
                {...register("description", { required: "Description is required" })}
                placeholder="Describe your AI adoption plans or funding needs..."
                rows={4}
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Submit Intake
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        </DCCard>

        {/* Results */}
        <div className="space-y-6">
          {result ? (
            <>
              <DCCard
                title={t('fundingIntake.triageResult')
                status={getStatusVariant(result.status)}
                headerAction={
                  <Badge className={result.status === "completed" ? "bg-green-500/10 text-green-400" : "bg-yellow-500/10 text-yellow-400"}>
                    {result.status === "completed" && <CheckCircle2 className="mr-1 h-3 w-3" />}
                    {result.status === "pending_human" && <AlertTriangle className="mr-1 h-3 w-3" />}
                    {result.status}
                  </Badge>
                }
                subtitle={`Run ID: ${result.runId}`}
              >
                {(() => {
                  const data = extractTriageData(result);
                  return (
                    <div className="space-y-4">
                      {/* Program Fit */}
                      {data.programFit.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">{t('fundingIntake.recommendedPrograms')}</h4>
                          <div className="flex flex-wrap gap-2">
                            {data.programFit.map((program: string, idx: number) => (
                              <Badge key={idx} variant="outline">{program}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Readiness Score */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">{t('fundingIntake.aiReadinessScore')}</h4>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-muted rounded-full h-3">
                            <div
                              className="bg-primary rounded-full h-3 transition-all"
                              style={{ width: `${data.readinessScore}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{data.readinessScore}/100</span>
                        </div>
                      </div>

                      {/* Priority */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2">{t('fundingIntake.priority')}</h4>
                        <Badge className={getPriorityColor(data.priority)}>
                          {data.priority.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Rationale */}
                      {data.rationale && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">{t('fundingIntake.assessmentRationale')}</h4>
                          <p className="text-sm text-muted-foreground">{data.rationale}</p>
                        </div>
                      )}

                      {/* Human Review Notice */}
                      {result.status === "pending_human" && result.humanTasks && result.humanTasks.length > 0 && (
                        <DCCard status="warning" className="bg-yellow-500/10 border-yellow-500/20">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <h4 className="text-sm font-semibold mb-1">{t('fundingIntake.humanReviewRequired')}</h4>
                              <p className="text-sm text-muted-foreground">
                                This case has been flagged for review by a{" "}
                                <span className="font-medium">{result.humanTasks[0].role}</span>.
                                {result.humanTasks[0].summary && ` ${result.humanTasks[0].summary}`}
                              </p>
                            </div>
                          </div>
                        </DCCard>
                      )}
                    </div>
                  );
                })()}
              </DCCard>

              {/* View Full Details */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/digital-twins/funding-intake-triage")}
              >
                View Full Twin Details & Runs
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <DCCard status="neutral">
              <div className="py-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">{t('fundingIntake.noResultsYet')}</h3>
                <p className="text-muted-foreground">
                  {t('fundingIntake.noResultsDesc')}
                </p>
              </div>
            </DCCard>
          )}
        </div>
      </div>
    </div>
  );
}
