/**
 * Multi-Factor Authentication - CAPABILITY UNAVAILABLE.
 *
 * Phase 11 security P0. This page previously accepted any six digits,
 * slept 1500ms, showed "Verification successful!" and navigated to "/".
 * It performed no enrollment, no challenge, no verification and no
 * assurance-level check: a visual simulation of a security control.
 *
 * Supabase MFA (`supabase.auth.mfa.*`) is not enrolled or enforced anywhere
 * in this codebase and no AAL2 requirement exists on any route. Rather than
 * keep a control that implies protection it does not provide, the interactive
 * controls are removed and the capability is labelled UNAVAILABLE.
 *
 * Re-enable only together with: enroll -> challenge -> verify -> recovery
 * codes -> route-level AAL2 enforcement, plus tests for each step.
 */

import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/components/auth";

export default function MFA() {
  return (
    <AuthLayout
      title="Multi-factor authentication"
      subtitle="This capability is not available on M2M AURA yet"
    >
      <div className="space-y-6">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
          </div>
        </div>

        <div
          role="status"
          className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground"
        >
          <p className="mb-2 font-medium text-foreground">Status: UNAVAILABLE</p>
          <p>
            Second-factor enrollment and verification are not enforced on this
            platform. No code is issued and no code can be verified here.
            Accounts are protected by password authentication, role-based
            access control and administrator approval only.
          </p>
        </div>

        <Button asChild variant="outline" className="w-full">
          <Link to="/">Return to sign-in</Link>
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Questions about account security?{" "}
          <a href="mailto:support@m2m.ai" className="text-primary hover:underline">
            Contact support
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}
