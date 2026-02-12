import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { OnboardingFormData } from "@/pages/Onboarding";
import { Target } from "lucide-react";

const goalOptions = [
  "Reduce PUE",
  "Optimize cooling",
  "Carbon/ESG reporting",
  "Capacity planning",
  "Predictive maintenance",
  "Sovereign compliance",
  "Other",
];

const timelineOptions = [
  "Exploring",
  "1-3 months",
  "3-6 months",
  "6-12 months",
];

export function StepGoals() {
  const { control, setValue, watch } = useFormContext<OnboardingFormData>();
  const selectedGoals = watch("goals") || [];

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
          <h2 className="text-xl font-display font-bold text-foreground">Your Goals</h2>
          <p className="text-sm text-muted-foreground">What do you want to achieve with M2M AURA?</p>
        </div>
      </div>

      {/* Goals multi-select */}
      <FormField
        control={control}
        name="goals"
        render={() => (
          <FormItem>
            <FormLabel>What are you looking to achieve?</FormLabel>
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
              Biggest Operational Challenge <span className="text-muted-foreground font-normal">(optional)</span>
            </FormLabel>
            <FormControl>
              <Textarea
                placeholder="e.g. We struggle with cooling efficiency during peak GPU workloads…"
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
            <FormLabel>Timeline to Deploy</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="When are you looking to get started?" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {timelineOptions.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
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
