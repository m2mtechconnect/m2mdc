import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingFormData } from "@/pages/Onboarding";
import { Target } from "lucide-react";
import { useTranslation } from "react-i18next";

export function StepGoals() {
  const { control, setValue, watch } = useFormContext<OnboardingFormData>();
  const { t } = useTranslation();
  const selectedGoals = watch("goals") || [];

  const goalOptions = [
    t('onboarding.goalOptions.reducePue'),
    t('onboarding.goalOptions.optimizeCooling'),
    t('onboarding.goalOptions.carbonEsg'),
    t('onboarding.goalOptions.capacityPlanning'),
    t('onboarding.goalOptions.predictiveMaintenance'),
    t('onboarding.goalOptions.sovereignCompliance'),
    t('onboarding.goalOptions.other'),
  ];

  const timelineOptions = [
    t('onboarding.timelineOptions.exploring'),
    t('onboarding.timelineOptions.oneToThree'),
    t('onboarding.timelineOptions.threeToSix'),
    t('onboarding.timelineOptions.sixToTwelve'),
  ];

  const toggleGoal = (goal: string) => {
    const updated = selectedGoals.includes(goal)
      ? selectedGoals.filter((g) => g !== goal)
      : [...selectedGoals, goal];
    setValue("goals", updated, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-accent/10">
          <Target className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">{t('onboarding.goalsTitle')}</h2>
          <p className="text-sm text-muted-foreground">{t('onboarding.goalsDesc')}</p>
        </div>
      </div>

      {/* Goals multi-select */}
      <FormField
        control={control}
        name="goals"
        render={() => (
          <FormItem>
            <FormLabel>{t('onboarding.whatLookingToAchieve')}</FormLabel>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {goalOptions.map((goal) => (
                <label
                  key={goal}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedGoals.includes(goal)
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedGoals.includes(goal)}
                    onCheckedChange={() => toggleGoal(goal)}
                  />
                  <span className="text-sm">{goal}</span>
                </label>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="challenge"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('onboarding.biggestChallenge')} <span className="text-muted-foreground font-normal">({t('onboarding.optional')})</span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('onboarding.challengePlaceholder')}
                className="min-h-[100px]"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="timeline"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('onboarding.timelineToDeploy')}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder={t('onboarding.timelinePlaceholder')} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {timelineOptions.map((option) => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
