import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OnboardingFormData } from "@/pages/Onboarding";
import { User, Building2 } from "lucide-react";

const jobTitles = ["CIO", "CTO", "VP Infrastructure", "Data Centre Manager", "Operations Lead", "Other"];
const companySizes = ["1-50", "51-200", "201-1,000", "1,000+"];

export function StepAboutYou() {
  const { control } = useFormContext<OnboardingFormData>();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-accent/10">
          <User className="h-5 w-5 text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">About You</h2>
          <p className="text-sm text-muted-foreground">Tell us a bit about yourself and your organization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Jane Smith" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Work Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="jane@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="job_title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Job Title / Role</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {jobTitles.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="company_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Size</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Number of employees" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {companySizes.map((s) => (
                    <SelectItem key={s} value={s}>{s} employees</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
