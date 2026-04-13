import { useTranslation } from "react-i18next";
/**
 * Admin view for onboarding questionnaire submissions
 * Only accessible to users with 'admin' role via RLS
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, Mail, Building2, Server, Target, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface OnboardingSubmission {
  id: string;
  full_name: string;
  email: string;
  job_title: string;
  company_name: string;
  company_size: string;
  num_data_centres: string;
  rack_count: string;
  workload_types: string[];
  current_pue: string | null;
  goals: string[];
  challenge: string | null;
  timeline: string;
  created_at: string;
}

function ExpandableRow({ submission }: { submission: OnboardingSubmission }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="font-medium">{submission.full_name}</TableCell>
        <TableCell>{submission.email}</TableCell>
        <TableCell>{submission.company_name}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">{submission.job_title}</Badge>
        </TableCell>
        <TableCell>{submission.company_size}</TableCell>
        <TableCell>
          <Badge variant="outline" className="text-xs">{submission.timeline}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">
          {format(new Date(submission.created_at), "MMM d, yyyy HH:mm")}
        </TableCell>
        <TableCell>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow className="bg-muted/20">
          <TableCell colSpan={8}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-3">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <Server className="h-3 w-3" /> Infrastructure
                </h4>
                <p className="text-sm"><span className="text-muted-foreground">Data Centres:</span> {submission.num_data_centres}</p>
                <p className="text-sm"><span className="text-muted-foreground">Racks:</span> {submission.rack_count}</p>
                {submission.current_pue && (
                  <p className="text-sm"><span className="text-muted-foreground">PUE:</span> {(parseInt(submission.current_pue) / 100).toFixed(2)}</p>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {(submission.workload_types || []).map((w) => (
                    <Badge key={w} variant="secondary" className="text-xs">{w}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2 flex items-center gap-1">
                  <Target className="h-3 w-3" /> Goals
                </h4>
                <div className="flex flex-wrap gap-1">
                  {(submission.goals || []).map((g) => (
                    <Badge key={g} variant="outline" className="text-xs">{g}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Challenge</h4>
                <p className="text-sm text-muted-foreground">
                  {submission.challenge || "Not provided"}
                </p>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function OnboardingSubmissions() {
  const { t } = useTranslation();
  const { data: submissions, isLoading, isError } = useQuery({
    queryKey: ["onboarding-submissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_submissions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      return (data || []) as OnboardingSubmission[];
    },
  });

  return (
    <div className="container mx-auto py-8 max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/10">
            <Users className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-h2 font-display font-bold">{t("onboardingSubmissions.title")}</h1>
            <p className="text-sm text-muted-foreground">
              Prospect questionnaire responses from the marketing page
            </p>
          </div>
        </div>
        {submissions && (
          <Badge variant="outline" className="text-sm px-3 py-1">
            {submissions.length} submissions
          </Badge>
        )}
      </div>

      {/* Stats row */}
      {submissions && submissions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Total Leads</span>
            </div>
            <div className="text-2xl font-bold">{submissions.length}</div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">This Week</span>
            </div>
            <div className="text-2xl font-bold">
              {submissions.filter((s) => {
                const d = new Date(s.created_at);
                const now = new Date();
                return now.getTime() - d.getTime() < 7 * 24 * 60 * 60 * 1000;
              }).length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Enterprise (1000+)</span>
            </div>
            <div className="text-2xl font-bold">
              {submissions.filter((s) => s.company_size === "1,000+").length}
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Ready (1-3 mo)</span>
            </div>
            <div className="text-2xl font-bold">
              {submissions.filter((s) => s.timeline === "1-3 months").length}
            </div>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-muted-foreground mb-2">Unable to load submissions.</p>
              <p className="text-xs text-muted-foreground">Admin role required to view this data.</p>
            </div>
          ) : submissions && submissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mail className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No submissions yet.</p>
              <p className="text-xs text-muted-foreground mt-1">
                Prospects who complete the onboarding questionnaire will appear here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Timeline</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions?.map((s) => (
                  <ExpandableRow key={s.id} submission={s} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
