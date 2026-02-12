import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import type { OnboardingFormData } from "@/pages/Onboarding";
import { Server } from "lucide-react";

const dataCentreOptions = ["1", "2-5", "6-20", "20+"];
const rackOptions = ["1-50", "51-200", "201-500", "500-1,000", "1,000+"];
const workloadOptions = [
  "AI/ML Training",
  "HPC",
  "Cloud Hosting",
  "Enterprise IT",
  "Colocation",
  "Other",
];

export function StepDataCentre() {
  const { control, setValue, watch } = useFormContext<OnboardingFormData>();
  const selectedWorkloads = watch("workload_types") || [];
  const currentPue = watch("current_pue");

  const toggleWorkload = (workload: string) => {
    const updated = selectedWorkloads.includes(workload)
      ? selectedWorkloads.filter((w) => w !== workload)
      : [...selectedWorkloads, workload];
    setValue("workload_types", updated, { shouldValidate: true });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-accent/10">
          <Server className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Your Data Centre</h2>
          <p className="text-sm text-muted-foreground">Help us understand your infrastructure.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="num_data_centres"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Number of Data Centres</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {dataCentreOptions.map((o) => (
                    <SelectItem key={o} value={o}>{o}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="rack_count"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Rack Count</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select range" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {rackOptions.map((o) => (
                    <SelectItem key={o} value={o}>{o} racks</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Workload type multi-select */}
      <FormField
        control={control}
        name="workload_types"
        render={() => (
          <FormItem>
            <FormLabel>Primary Workload Type</FormLabel>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {workloadOptions.map((workload) => (
                <label
                  key={workload}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedWorkloads.includes(workload)
                      ? "border-accent bg-accent/5"
                      : "border-border hover:border-accent/50"
                  }`}
                >
                  <Checkbox
                    checked={selectedWorkloads.includes(workload)}
                    onCheckedChange={() => toggleWorkload(workload)}
                  />
                  <span className="text-sm">{workload}</span>
                </label>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* PUE slider (optional) */}
      <FormField
        control={control}
        name="current_pue"
        render={() => (
          <FormItem>
            <FormLabel>
              Current PUE Estimate <span className="text-muted-foreground font-normal">(optional)</span>
            </FormLabel>
            <div className="pt-2">
              <Slider
                min={100}
                max={300}
                step={5}
                value={[currentPue ? parseInt(currentPue) : 150]}
                onValueChange={([v]) => setValue("current_pue", String(v))}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>1.00</span>
                <span className="font-medium text-foreground">
                  {currentPue ? (parseInt(currentPue) / 100).toFixed(2) : "1.50"}
                </span>
                <span>3.00</span>
              </div>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
